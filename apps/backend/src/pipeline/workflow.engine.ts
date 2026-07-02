import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMService } from '../agents/llm.service';
import { FeaturesService } from '../features/features.service';
import { TmsService } from '../tms/tms.service';
import { UrlFetcherService } from '../common/url-fetcher/url-fetcher.service';
import {
  PipelineStage,
  PIPELINE_STAGE_ORDER,
} from './pipeline.entity';
import { ArtifactType } from '../features/feature-artifact.entity';

export interface StageResult {
  stage: PipelineStage;
  status: 'completed' | 'failed' | 'blocked' | 'waiting_for_qa';
  output?: any;
  error?: string;
  fatal?: boolean;
  questions?: Array<{ question: string; reason: string; severity: string }>;
  coverageGaps?: string[];
  timestamp: Date;
}

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);

  constructor(
    private llmService: LLMService,
    private featuresService: FeaturesService,
    private tmsService: TmsService,
    private configService: ConfigService,
    private urlFetcherService: UrlFetcherService,
  ) {}

  private parseJsonResponse(content: string): any {
    let cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in LLM response');
    }
  }

  async executeStage(
    stage: PipelineStage,
    featureSlug: string,
    previousResults: Record<string, any>,
  ): Promise<StageResult> {
    this.logger.log(`Executing stage: ${stage} for feature: ${featureSlug}`);

    try {
      const feature = await this.featuresService.findBySlug(featureSlug);
      let output: any;

      switch (stage) {
        case PipelineStage.SOURCE_INGESTED:
          output = await this.ingestSource(feature.id, previousResults);
          break;
        case PipelineStage.REQUIREMENTS_EXTRACTED:
          return await this.extractRequirements(feature.id, previousResults, feature.slug);
        case PipelineStage.TEST_PLAN_CREATED:
          output = await this.createTestPlan(feature.id, previousResults);
          break;
        case PipelineStage.TEST_CASES_CREATED:
          output = await this.createTestCases(feature.id, previousResults);
          break;
        case PipelineStage.COVERAGE_AUDITED:
          return await this.auditCoverage(feature.id, previousResults);
        case PipelineStage.REVIEW:
          return await this.review(feature.id, previousResults);
        case PipelineStage.DRY_RUN_COMPLETED:
          return await this.dryRun(feature.id, previousResults);
        case PipelineStage.PUBLISHED:
          output = await this.publish(feature.id, previousResults);
          break;
        default:
          output = { message: `Stage ${stage} completed` };
      }

      return {
        stage,
        status: 'completed',
        output,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Stage ${stage} failed: ${error.message}`);
      return {
        stage,
        status: 'failed',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  private async ingestSource(
    featureId: string,
    previousResults: Record<string, any>,
  ) {
    const sourceArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.SOURCE,
    );
    if (!sourceArtifact) {
      throw new Error('Source artifact not found');
    }
    return {
      message: 'Source ingested',
      sourceId: sourceArtifact.id,
    };
  }

  private async extractRequirements(
    featureId: string,
    previousResults: Record<string, any>,
    featureSlug?: string,
  ): Promise<StageResult> {
    const feature = featureSlug
      ? await this.featuresService.findBySlug(featureSlug)
      : await this.featuresService.findById(featureId);

    if (feature.sourceType === 'url' && feature.sourceUrl) {
      this.logger.log(`Re-fetching source from URL: ${feature.sourceUrl}`);
      try {
        const fetchResult = await this.urlFetcherService.fetchUrl(feature.sourceUrl);
        if (fetchResult.ok) {
          await this.featuresService.upsertArtifact(featureId, ArtifactType.SOURCE, {
            text: fetchResult.text || '',
            images: (fetchResult.images || []).map((img) => ({
              data: img.data,
              mimeType: img.mimeType,
              name: img.name,
            })),
            metadata: fetchResult.metadata || {},
          });
          this.logger.log(`Source re-fetched successfully from URL`);
        } else {
          this.logger.warn(`URL re-fetch failed: ${fetchResult.error}, using cached source`);
        }
      } catch (err) {
        this.logger.warn(`URL re-fetch error: ${err.message}, using cached source`);
      }
    }

    const sourceArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.SOURCE,
    );
    const sourceContent = sourceArtifact?.content || {};

    const existingArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.REQUIREMENTS,
    );
    const existingRequirements = existingArtifact?.content?.requirements || [];
    const hasExisting = existingRequirements.length > 0;

    const systemPrompt = hasExisting
      ? `Ты агент Requirements Analyst.
Требования уже были извлечены ранее. Твоя задача — ПРОВЕРИТЬ их.

Существующие требования:
${JSON.stringify(existingRequirements, null, 2)}

Инструкции:
1. Прочитай исходный документ
2. Сравни каждое существующее требование с документом
3. Определи: все ли аспекты документа покрыты?

Если ВСЕ аспекты покрыты и нет вопросов:
- Верни requirements БЕЗ ИЗМЕНЕНИЙ (копию существующих)
- Верни open_questions: []

Если что-то ПРОПУЩЕНО:
- Добавь ТОЛЬКО отсутствующие требования (не дублируй существующие)
- Новые требования нумеруй продолжением (REQ-0XX)
- Если есть вопросы — добавь в open_questions

КРИТИЧНО:
- НЕ дублируй существующие требования (не переписывай их своими словами)
- НЕ изменяй ID существующих требований
- НЕ разбивай одно требование на несколько мелких
- Если всё покрыто — open_questions: [] и requirements без изменений

Формат:
{
  "requirements": [...],
  "open_questions": [
    {
      "question": "Текст вопроса",
      "reason": "Причина вопроса",
      "severity": "high|medium|low"
    }
  ]
}`
      : `Ты агент Requirements Analyst.
Извлеки ВСЕ требования из предоставленного текста.

ИНСТРУКЦИИ ПО ГЛУБОКОМУ АНАЛИЗУ:
1. Прочитай документ ЦЕЛИКОМ, включая все разделы
2. Извлекай требования из:
   - Описания функционала
   - Требований и ограничений
   - Критериев приемки
   - Ролей и прав доступа
   - Форматов данных и валидации
   - BPMN-схем и процессов
   - UX/UI описаний
3. Каждое требование должно быть:
   - Конкретным (не абстрактным)
   - Проверяемым (имеет критерий проверки)
   - Изолированным (одно требование = одно действие/свойство)
4. Если документ содержит неоднозначности — добавь вопрос в open_questions

ОБЯЗАТЕЛЬНО проверяй на противоречия и несогласованность:
- Разные названия одного объекта в разных разделах (роли, статусы, поля, сущности)
- Противоречивые критерии приемки (одно требование говорит Х, другое — Y)
- Несовместимые ограничения (например, время < 5 сек И > 10 сек)
- Задвоение ролей с разными названиями, но похожими описаниями и правами
- Пропущенные или незаполненные поля, которые required в других разделах
- Несоответствие между описанием функционала и критериями приемки

ПРИМЕРЫ ВОПРОСОВ ОБЯЗАННОСТЕЙ (LLM должен задавать аналогичные):
- "В разделе 'Описание' роль называется ROLE_BATCH_CATEGORY_ADJUSTMENT_VIEW, а в 'Критериях приемки' — ROLE_MASS_CATEGORY_CORRECTOR_VIEW. Какое название является валидным?"
- "Требование X требует время отклика < 2сек, но требование Y требует < 10сек. Это противоречие — какое верно?"
- "Роль X упоминается в описании с правами A, B, C, но в критериях приемки указаны права A, B. Какой полный набор прав верный?"

Формат каждого требования:
- id: REQ-### (последовательная нумерация с 001)
- title: краткое название требования
- description: полное описание (детальное, содержательное)
- priority: high|medium|low
- type: functional|non-functional|constraint

КРИТИЧНО: requirements НЕ может быть пустым массивом.
Если документ не содержит требований — добавь вопрос в open_questions с severity: "high".

Верни только JSON без markdown-обёртки:
{
  "requirements": [
    {
      "id": "REQ-001",
      "title": "Название",
      "description": "Детальное описание требования",
      "priority": "high",
      "type": "functional"
    }
  ],
  "open_questions": [
    {
      "question": "Текст вопроса",
      "reason": "Причина вопроса",
      "severity": "high|medium|low"
    }
  ]
}`;

    const userContent = hasExisting
      ? `Исходный документ:\n${JSON.stringify(sourceContent)}\n\nПроверь существующие требования. Если всё покрыто — верни без изменений с пустым open_questions.`
      : JSON.stringify(sourceContent);

    const response = await this.llmService.complete(
      PipelineStage.REQUIREMENTS_EXTRACTED,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    );

    this.logger.log(`LLM response [requirements]: ${response.content.substring(0, 200)}`);

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      this.logger.error(`LLM JSON parse failed [requirements]: ${response.content.substring(0, 500)}`);
      parsed = { requirements: [], open_questions: [] };
    }

    const requirements = parsed.requirements || [];
    const openQuestions = parsed.open_questions || [];

    // Валидация: requirements не может быть пустым
    if (requirements.length === 0) {
      this.logger.error('Requirements stage failed: no requirements extracted');
      return {
        stage: PipelineStage.REQUIREMENTS_EXTRACTED,
        status: 'failed',
        error: 'Не удалось извлечь требования из документа. Проверьте содержимое источника.',
        output: { requirements: [] },
        questions: openQuestions,
        timestamp: new Date(),
      };
    }

    // Сохраняем артефакт требований
    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.REQUIREMENTS,
      { requirements, open_questions: openQuestions },
    );

    // Если есть вопросы — блокируем pipeline
    if (openQuestions.length > 0) {
      this.logger.log(`Requirements stage blocked: ${openQuestions.length} questions`);
      return {
        stage: PipelineStage.REQUIREMENTS_EXTRACTED,
        status: 'blocked',
        output: { requirements },
        questions: openQuestions.map((q: any) => ({
          question: q.question || q.text || q.title || '',
          reason: q.reason || q.description || q.detail || '',
          severity: q.severity || 'medium',
        })),
        timestamp: new Date(),
      };
    }

    return {
      stage: PipelineStage.REQUIREMENTS_EXTRACTED,
      status: 'completed',
      output: { requirements },
      timestamp: new Date(),
    };
  }

  private async createTestPlan(
    featureId: string,
    previousResults: Record<string, any>,
  ) {
    const requirementsArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.REQUIREMENTS,
    );

    // Валидация: требования должны существовать
    if (!requirementsArtifact || !requirementsArtifact.content?.requirements?.length) {
      return {
        stage: PipelineStage.TEST_PLAN_CREATED,
        status: 'failed',
        error: 'Требования не найдены. Убедитесь что этап Requirements завершён успешно.',
        timestamp: new Date(),
      };
    }

    const response = await this.llmService.complete(
      PipelineStage.TEST_PLAN_CREATED,
      [
        {
          role: 'system',
          content: `Ты агент Test Plan Designer.
На основе требований создай тест-план.

На вход подаётся сводка требований (requirements).

Верни только JSON без markdown-обёртки:
{
  "test_plan_markdown": "# Тест план\n\n## Объём тестирования\n\n## Подход\n\n## Среды\n\n## Риски"
}`,
        },
        {
          role: 'user',
          content: JSON.stringify(requirementsArtifact?.content || {}),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      parsed = { test_plan_markdown: response.content };
    }

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.TESTPLAN,
      parsed,
    );

    return parsed;
  }

  private async createTestCases(
    featureId: string,
    previousResults: Record<string, any>,
  ) {
    const requirementsArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.REQUIREMENTS,
    );

    // Валидация: требования должны существовать
    if (!requirementsArtifact || !requirementsArtifact.content?.requirements?.length) {
      return {
        stage: PipelineStage.TEST_CASES_CREATED,
        status: 'failed',
        fatal: true,
        error: 'Требования не найдены. Убедитесь что этап Requirements завершён успешно.',
        timestamp: new Date(),
      };
    }

    let existingSections: { id: string; name: string; parentId: string | null }[] = [];
    try {
      const projectId = this.configService.get<string>('TESTRAIL_PROJECT_ID');
      if (projectId) {
        const tree = await this.tmsService.getTree(projectId);
        existingSections = tree
          .filter((node) => node.type === 'section')
          .map((node) => ({ id: node.id, name: node.name, parentId: node.parentId || null }));
      }
    } catch (error) {
      this.logger.warn(`Не удалось загрузить секции TMS для createTestCases: ${error.message}`);
    }

    const response = await this.llmService.complete(
      PipelineStage.TEST_CASES_CREATED,
      [
        {
          role: 'system',
          content: `Ты агент Test Case Designer.
На основе требований создай тест-кейсы.

На вход подаётся сводка требований (requirements) и список существующих секций (existingSections) в TMS.

ВАЖНО: Если в требованиях есть неясности — добавь их в поле needs_clarification в каждом кейсе, но НЕ блокируй генерацию.

Для каждого тест-кейса указывай в поле "section" название подходящей существующей секции из existingSections.
Если ни одна существующая секция не подходит — предложи новое название.

Верни только JSON без markdown-обёртки:
{
  "cases": [
    {
      "id": "TC-001",
      "title": "...",
      "section": "...",
      "priority": "high|medium|low",
      "type": "positive|negative|boundary|validation|permission|integration|regression",
      "status": "draft",
      "automation_candidate": true,
      "preconditions": "...",
      "steps": [
        { "action": "...", "expected": "..." }
      ],
      "final_expected_result": "...",
      "requirement_ids": ["REQ-001"],
      "test_data": [],
      "tags": []
    }
  ]
}`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            requirements: requirementsArtifact?.content || {},
            existingSections,
          }),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      this.logger.error('LLM returned invalid JSON for test_cases_created');
      return {
        stage: PipelineStage.TEST_CASES_CREATED,
        status: 'failed',
        fatal: true,
        error: 'LLM вернул невалидный JSON.',
        timestamp: new Date(),
      };
    }

    if (!parsed.cases?.length) {
      this.logger.error('LLM returned empty cases for test_cases_created');
      return {
        stage: PipelineStage.TEST_CASES_CREATED,
        status: 'failed',
        fatal: true,
        error: 'LLM не сгенерировал тест-кейсы.',
        timestamp: new Date(),
      };
    }

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.TESTCASES,
      parsed,
    );

    return parsed;
  }

  private async auditCoverage(
    featureId: string,
    previousResults: Record<string, any>,
  ): Promise<StageResult> {
    const requirementsArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.REQUIREMENTS,
    );
    const testcasesArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.TESTCASES,
    );

    // Валидация: требования и тест-кейсы должны существовать
    if (!requirementsArtifact || !requirementsArtifact.content?.requirements?.length) {
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'failed',
        error: 'Требования не найдены. Убедитесь что этап Requirements завершён успешно.',
        timestamp: new Date(),
      };
    }
    if (!testcasesArtifact || !testcasesArtifact.content?.cases?.length) {
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'failed',
        error: 'Тест-кейсы не найдены. Убедитесь что этап Test Cases завершён успешно.',
        timestamp: new Date(),
      };
    }

    const response = await this.llmService.complete(
      PipelineStage.COVERAGE_AUDITED,
      [
        {
          role: 'system',
           content: `Проведи аудит покрытия требований тест-кейсами.

 ПРАВИЛА:
 - "Covered" = есть хотя бы один тест-кейс, чьи шаги (steps) проверяют это требование
 - "Partially Covered" = кейс есть, но не все аспекты проверены
 - "Not Covered" = тест-кейсов вообще нет

 ВАЖНО:
 - В gaps добавляй ТОЛЬКО аспекты, которых ДЕЙСТВИТЕЛЬНО нет ни в одном тест-кейсе
 - НЕ добавляй гипотетические edge cases, если требование не упоминает их
 - Если требование говорит "должна быть кнопка" — кейс на нажатие кнопки = Covered
 - Анализируй шаги (steps) каждого тест-кейса, а не только заголовок
 - Перечитывай каждый gap из предыдущего раунда: если сейчас есть кейс, который закрывает этот gap — НЕ добавляй его снова

 Формат gaps: ["REQ-001: нет проверки X", ...]
 Где X — конкретный аспект из текста требования, которого нет в шагах тест-кейсов.

 Верни только JSON без markdown-обёртки:
 {
   "coverage": {
     "requirements_coverage": [
       { "requirement_id": "REQ-001", "status": "Covered", "covered_by": ["TC-001", "TC-002"] }
     ]
   },
   "coverage_matrix_markdown": "| REQ | Status | Covered by |\n|-----|--------|------------|\n| REQ-001 | Covered | TC-001 |",
   "gaps": ["...", "..."]
 }`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            requirements: requirementsArtifact?.content,
            testCases: testcasesArtifact?.content,
          }),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      parsed = { coverage: {}, gaps: [] };
    }

    const gaps = parsed.gaps || [];

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.COVERAGE,
      {
        coverage: parsed.coverage || {},
        coverage_matrix_markdown: parsed.coverage_matrix_markdown || '',
      },
    );

    // Если есть gaps — показываем QA, ждём команды
    if (gaps.length > 0) {
      this.logger.log(`Coverage gaps found: ${gaps.length}`);
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'waiting_for_qa',
        output: parsed.coverage || {},
        coverageGaps: gaps,
        timestamp: new Date(),
      };
    }

    return {
      stage: PipelineStage.COVERAGE_AUDITED,
      status: 'completed',
      output: parsed.coverage || {},
      timestamp: new Date(),
    };
  }

  private async review(
    featureId: string,
    previousResults: Record<string, any>,
  ): Promise<StageResult> {
    const testcasesArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.TESTCASES,
    );

    // Валидация: тест-кейсы должны существовать
    if (!testcasesArtifact || !testcasesArtifact.content?.cases?.length) {
      return {
        stage: PipelineStage.REVIEW,
        status: 'failed',
        error: 'Тест-кейсы не найдены. Убедитесь что этап Test Cases завершён успешно.',
        timestamp: new Date(),
      };
    }

    const coverageArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.COVERAGE,
    );

    const response = await this.llmService.complete(
      PipelineStage.REVIEW,
      [
        {
          role: 'system',
          content: `Проведи ревью тест-кейсов. Проверь качество, полноту, корректность, связность с требованиями.

Оцени общее качество: "high", "medium" или "low".
Выдели сильные стороны (strengths) — что сделано хорошо.
Выдели замечания (weaknesses) — что можно улучшить.
Дай рекомендации (recommendations) — конкретные шаги по улучшению.
Напиши краткое резюме (summary) — 2-3 предложения.

Верни только JSON без markdown-обёртки:
{
  "summary": "Краткое резюме...",
  "overall_quality": "high",
  "strengths": ["Хорошая группировка", "Полное покрытие"],
  "weaknesses": ["REQ-003 покрыто частично"],
  "recommendations": ["Добавить негативные кейсы"]
}`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            testCases: testcasesArtifact?.content,
            coverage: coverageArtifact?.content,
          }),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      parsed = { review: response.content };
    }

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.REVIEW,
      parsed,
    );

    // HARD STOP — review всегда ждёт апрува QA
    return {
      stage: PipelineStage.REVIEW,
      status: 'waiting_for_qa',
      output: parsed,
      timestamp: new Date(),
    };
  }

  private async dryRun(
    featureId: string,
    previousResults: Record<string, any>,
  ): Promise<StageResult> {
    const testcasesArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.TESTCASES,
    );

    if (!testcasesArtifact || !testcasesArtifact.content?.cases?.length) {
      return {
        stage: PipelineStage.DRY_RUN_COMPLETED,
        status: 'failed',
        error: 'Тест-кейсы не найдены. Убедитесь что этап Test Cases завершён успешно.',
        timestamp: new Date(),
      };
    }

    const cases = testcasesArtifact.content.cases;

    const projectId = this.configService.get<string>('TESTRAIL_PROJECT_ID');
    let existingSections: Array<{ id: string; name: string; parentId: string | null }> = [];

    if (projectId) {
      this.logger.log(`Dry run: fetching TMS tree for project ${projectId}`);
      try {
        const tree = await this.tmsService.getTree(projectId);
        existingSections = tree
          .filter((node) => node.type === 'section')
          .map((node) => ({ id: node.id, name: node.name, parentId: node.parentId || null }));
        this.logger.log(`Dry run: loaded ${existingSections.length} sections from TMS`);
      } catch (error) {
        this.logger.warn(`Dry run: failed to fetch TMS sections: ${error.message}`);
      }
    } else {
      this.logger.warn('Dry run: TESTRAIL_PROJECT_ID not configured, existingSections will be empty');
    }

    const feature = await this.featuresService.findById(featureId);

    const response = await this.llmService.complete(
      PipelineStage.DRY_RUN_COMPLETED,
      [
        {
          role: 'system',
          content: `Ты QA-инженер. Проанализируй тест-кейсы и существующие секции TestRail.
 Распредели каждый тест-кейс по секциям для публикации.

 ПРИБОРИТЕТ СУЩЕСТВУЮЩИХ СЕКЦИЙ:
 Перед тем как создавать новые секции, проверь список existingSections.
 Если название существующей секции семантически совпадает с функциональностью
 тест-кейсов — используй её через targetSectionId. Новая секция создаётся
 ТОЛЬКО если ни одна существующая не подходит.

 Пример: если есть секция "Уведомления" и фича про уведомления — используй
 targetSectionId этой секции, а не создавай новую.

 Если кейсы охватывают подфичу внутри существующей секции — создай подпапку
 через targetSectionPath, начинающийся с названия существующей секции:
   ["Уведомления", "Отложенная отправка"]

 Ключевые правила группировки:
 - Группируй кейсы по функциональности. Все кейсы об одной функции
   должны быть в одной папке. Например, все кейсы о "Запуске корректировки"
   (позитивные, негативные, валидация) — в папке "Запуск корректировки".
 - Не создавай отдельные папки для positive/negative/validation —
   тип кейса виден из названия и тегов.
 - Используй поле "section" из тест-кейса как подсказку для группировки,
   но окончательное решение принимай на основе семантики и связности.
 - Создавай подпапки только для семантически разных функциональных
   областей. Например:
     "Создание заявки"
       "Загрузка CSV"          ← отдельная функциональность
       "Валидация"             ← отдельная функциональность
 - Для каждой секции укажи полный путь от корня через targetSectionPath.

 Для каждого кейса укажи ОДНО из двух:
 - targetSectionId — ID существующей секции (если подходящая есть)
 - targetSectionPath — массив названий от корня до целевой секции.
   Например: ["Массовая корректировка", "Запуск корректировки"]

 Если создаёшь новую секцию внутри существующей — targetSectionPath должен
 начинаться с названия этой существующей секции (её имя, а не ID).

 Пример правильной иерархии:
   ["Массовая корректировка", "Роли доступа"]
   ["Массовая корректировка", "Создание заявки"]
   ["Массовая корректировка", "Создание заявки", "Загрузка CSV"]
   ["Массовая корректировка", "Создание заявки", "Валидация"]
   ["Массовая корректировка", "Запуск корректировки"]

 Пример использования существующей секции:
   ["Уведомления", "Отложенная отправка"]  ← подпапка внутри "Уведомления"

 Верни только JSON без markdown-обёртки:
 {
   "cases": [
     {
       "id": "TC-001",
       "title": "Отложенная отправка push-уведомления",
       "targetSectionId": "48"
     },
     {
       "id": "TC-002",
       "title": "Валидация времени отправки",
       "targetSectionPath": ["Уведомления", "Отложенная отправка"]
     }
   ]
 }`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            featureTitle: feature.title,
            existingSections,
            testCases: cases.map((c: any) => ({
              id: c.id,
              title: c.title,
              section: c.section,
              priority: c.priority,
              type: c.type,
              steps: c.steps,
            })),
          }),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      parsed = { cases: [] };
    }

    // Собираем все targetSectionPath → строим дерево новых секций с virtual ID
    const newSectionMap = new Map<string, { name: string; parentId: string | null }>();
    const allPaths = new Set<string>();

    for (const c of (parsed.cases || [])) {
      if (c.targetSectionPath?.length) {
        const pathKey = JSON.stringify(c.targetSectionPath);
        if (allPaths.has(pathKey)) continue;
        allPaths.add(pathKey);
        for (let i = 0; i < c.targetSectionPath.length; i++) {
          const segId = `__new__/${c.targetSectionPath.slice(0, i + 1).join('/')}`;
          if (!newSectionMap.has(segId)) {
            const parentId = i > 0
              ? `__new__/${c.targetSectionPath.slice(0, i).join('/')}`
              : null;
            newSectionMap.set(segId, { name: c.targetSectionPath[i], parentId });
          }
        }
      }
    }

    const newSections = Array.from(newSectionMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      parentId: data.parentId,
    }));

    const mergedCases = cases.map((original: any) => {
      const llmResult = parsed.cases?.find((c: any) => c.id === original.id);
      let targetSectionId = llmResult?.targetSectionId || null;
      let targetSectionName = null;

      if (llmResult?.targetSectionPath?.length) {
        targetSectionId = `__new__/${llmResult.targetSectionPath.join('/')}`;
        targetSectionName = llmResult.targetSectionPath[llmResult.targetSectionPath.length - 1];
      } else if (llmResult?.targetSectionId) {
        const existing = existingSections.find(s => s.id === llmResult.targetSectionId);
        targetSectionName = existing?.name || null;
      }

      return {
        ...original,
        status: original.status || 'draft',
        targetSectionId,
        targetSectionName,
        published: false,
      };
    });

    const approvedCount = mergedCases.filter((c: any) => c.status === 'approved').length;
    const draftCount = mergedCases.filter((c: any) => c.status === 'draft').length;

    const dryRunArtifact = {
      sections: {
        existing: existingSections,
        new: newSections,
      },
      cases: mergedCases,
      summary: {
        total: mergedCases.length,
        approved: approvedCount,
        draft: draftCount,
        existingSections: existingSections.length,
        newSections: newSections.length,
      },
    };

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.DRY_RUN,
      dryRunArtifact,
    );

    return {
      stage: PipelineStage.DRY_RUN_COMPLETED,
      status: 'waiting_for_qa',
      output: dryRunArtifact,
      timestamp: new Date(),
    };
  }

  private async publish(
    featureId: string,
    previousResults: Record<string, any>,
  ) {
    return {
      message: 'Pipeline completed. Ready for TestRail publish.',
    };
  }

  async fillGaps(
    featureId: string,
    gaps: string[],
  ): Promise<StageResult> {
    const requirementsArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.REQUIREMENTS,
    );
    const testcasesArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.TESTCASES,
    );

    if (!requirementsArtifact || !requirementsArtifact.content?.requirements?.length) {
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'failed',
        error: 'Требования не найдены',
        timestamp: new Date(),
      };
    }
    if (!testcasesArtifact || !testcasesArtifact.content?.cases?.length) {
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'failed',
        error: 'Тест-кейсы не найдены',
        timestamp: new Date(),
      };
    }

    const existingCases = testcasesArtifact.content.cases;
    const maxExistingId = this.extractMaxCaseId(existingCases);

    let existingSections: { id: string; name: string; parentId: string | null }[] = [];
    try {
      const projectId = this.configService.get<string>('TESTRAIL_PROJECT_ID');
      if (projectId) {
        const tree = await this.tmsService.getTree(projectId);
        existingSections = tree
          .filter((node) => node.type === 'section')
          .map((node) => ({ id: node.id, name: node.name, parentId: node.parentId || null }));
      }
    } catch {
      this.logger.warn('Не удалось загрузить секции TMS для fillGaps');
    }

    const response = await this.llmService.complete(
      PipelineStage.TEST_CASES_CREATED,
      [
        {
          role: 'system',
           content: `Ты агент Test Case Designer.
 Аудит покрытия выявил пробелы — нужны дополнительные тест-кейсы.

 ВНИМАНИЕ: ниже передан ПОЛНЫЙ список существующих тест-кейсов и список существующих секций (existingSections) в TMS.
 Проверь каждый gap — возможно, он уже покрыт существующим кейсом.
 Создавай новый кейс ТОЛЬКО если существующие не закрывают gap.

 Для каждого тест-кейса указывай в поле "section" название подходящей существующей секции из existingSections.
 Если ни одна существующая секция не подходит — предложи новое название.

 ГРУППИРОВКА:
 Объединяй позитивные и негативные кейсы с похожими шагами или одним уровнем проверки.
 - Если проверяешь валидацию нескольких полей одной формы — один кейс с несколькими шагами, а не по кейсу на поле.
 - Если проверяешь негативные сценарии одного модуля (например, кодировки CSV) — один кейс, шаги по каждому сценарию.
 - Не создавай отдельные кейсы с одним шагом внутри.

 Формат каждого тест-кейса:
 - id: TC-### (используй нумерацию начиная с ${maxExistingId + 1})
 - title: краткое название
 - section: секция
 - priority: high|medium|low
 - type: positive|negative|boundary|validation|permission|integration|regression
 - status: draft
 - automation_candidate: true
 - preconditions: условия
 - steps: [{ action, expected }] — несколько шагов, если проверяешь связанные аспекты
 - final_expected_result: ожидаемый результат
 - requirement_ids: ["REQ-001"]
 - test_data: []
 - tags: []

 Верни только JSON без markdown-обёртки:
 { "cases": [новые тест-кейсы] }`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            requirements: requirementsArtifact.content,
            gaps,
            existingCases,
            existingSections,
          }),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      this.logger.error(`LLM JSON parse failed [fill-gaps]: ${response.content.substring(0, 500)}`);
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'failed',
        error: 'LLM не сгенерировал тест-кейсы для пробелов',
        timestamp: new Date(),
      };
    }

    const newCases = parsed.cases || [];
    if (newCases.length === 0) {
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'failed',
        error: 'LLM не вернул тест-кейсы',
        timestamp: new Date(),
      };
    }

    // Merge: existing + new, fix ID collisions
    const merged = this.mergeCases(existingCases, newCases, maxExistingId);

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.TESTCASES,
      { cases: merged },
    );

    this.logger.log(`Fill gaps: added ${newCases.length} cases, total: ${merged.length}`);

    return {
      stage: PipelineStage.TEST_CASES_CREATED,
      status: 'completed',
      output: { cases: merged },
      timestamp: new Date(),
    };
  }

  private extractMaxCaseId(cases: any[]): number {
    let max = 0;
    for (const c of cases) {
      const match = (c.id || '').match(/TC-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return max;
  }

  private mergeCases(existing: any[], newCases: any[], maxId: number): any[] {
    const usedIds = new Set<string>();
    const merged = existing.map((c) => {
      usedIds.add(c.id);
      return c;
    });

    let nextId = maxId + 1;
    for (const nc of newCases) {
      let id = `TC-${String(nextId).padStart(3, '0')}`;
      while (usedIds.has(id)) {
        nextId++;
        id = `TC-${String(nextId).padStart(3, '0')}`;
      }
      usedIds.add(id);
      merged.push({ ...nc, id, status: 'draft' });
      nextId++;
    }

    return merged;
  }

  getNextStage(currentStage: PipelineStage): PipelineStage | null {
    const currentIndex = PIPELINE_STAGE_ORDER.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === PIPELINE_STAGE_ORDER.length - 1) {
      return null;
    }
    return PIPELINE_STAGE_ORDER[currentIndex + 1];
  }

  getStageIndex(stage: PipelineStage): number {
    return PIPELINE_STAGE_ORDER.indexOf(stage);
  }
}
