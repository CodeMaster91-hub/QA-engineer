import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../agents/llm.service';
import { FeaturesService } from '../features/features.service';
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
          return await this.extractRequirements(feature.id, previousResults);
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
  ): Promise<StageResult> {
    const sourceArtifact = await this.featuresService.getArtifact(
      featureId,
      ArtifactType.SOURCE,
    );
    const sourceContent = sourceArtifact?.content || {};

    const response = await this.llmService.complete(
      PipelineStage.REQUIREMENTS_EXTRACTED,
      [
        {
          role: 'system',
          content: `Ты агент Requirements Analyst.
Извлеки требования из предоставленного текста.

КРИТИЧНО: requirements НЕ может быть пустым массивом. Каждый документ содержит хотя бы одно требование.
Если документ не содержит требований — добавь вопрос в open_questions с severity: "high".

Формат каждого требования:
- id: REQ-### (последовательная нумерация)
- title: краткое название требования
- description: полное описание
- priority: high|medium|low
- type: functional|non-functional|constraint

Верни только JSON без markdown-обёртки:
{
  "requirements": [
    {
      "id": "REQ-001",
      "title": "Регистрация через email",
      "description": "Пользователь может зарегистрироваться через email",
      "priority": "high",
      "type": "functional"
    }
  ],
  "open_questions": []
}`,
        },
        {
          role: 'user',
          content: JSON.stringify(sourceContent),
        },
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
      { requirements },
    );

    // Если есть вопросы — блокируем pipeline
    if (openQuestions.length > 0) {
      this.logger.log(`Requirements stage blocked: ${openQuestions.length} questions`);
      return {
        stage: PipelineStage.REQUIREMENTS_EXTRACTED,
        status: 'blocked',
        output: { requirements },
        questions: openQuestions.map((q: any) => ({
          question: q.question || '',
          reason: q.reason || '',
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
        error: 'Требования не найдены. Убедитесь что этап Requirements завершён успешно.',
        timestamp: new Date(),
      };
    }

    const response = await this.llmService.complete(
      PipelineStage.TEST_CASES_CREATED,
      [
        {
          role: 'system',
          content: `Ты агент Test Case Designer.
На основе требований создай тест-кейсы.

На вход подаётся сводка требований (requirements).

ВАЖНО: Если в требованиях есть неясности — добавь их в поле needs_clarification в каждом кейсе, но НЕ блокируй генерацию.

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
          content: JSON.stringify(requirementsArtifact?.content || {}),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      parsed = { cases: [] };
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

Для каждого требования укажи статус покрытия: Covered, Partially Covered или Not Covered.
Перечисли тест-кейсы, которые покрывают каждое требование.

Если есть требования, которые не покрыты тест-кейсами — добавь их описание в поле gaps.
Формат gaps: ["REQ-001: нет негативного тест-кейса", "REQ-003: не проверяется boundary case"]

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

    const coverage = parsed.coverage || {};
    const gaps = parsed.gaps || [];

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.COVERAGE,
      coverage,
    );

    // Если есть gaps — показываем QA, ждём команды
    if (gaps.length > 0) {
      this.logger.log(`Coverage gaps found: ${gaps.length}`);
      return {
        stage: PipelineStage.COVERAGE_AUDITED,
        status: 'waiting_for_qa',
        output: coverage,
        coverageGaps: gaps,
        timestamp: new Date(),
      };
    }

    return {
      stage: PipelineStage.COVERAGE_AUDITED,
      status: 'completed',
      output: coverage,
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
          content:
            'Проведи ревью тест-кейсов. Проверь качество, полноту, корректность. Верни только JSON без markdown-обёртки с результатами ревью.',
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

    // Валидация: тест-кейсы должны существовать
    if (!testcasesArtifact || !testcasesArtifact.content?.cases?.length) {
      return {
        stage: PipelineStage.DRY_RUN_COMPLETED,
        status: 'failed',
        error: 'Тест-кейсы не найдены. Убедитесь что этап Test Cases завершён успешно.',
        timestamp: new Date(),
      };
    }

    const response = await this.llmService.complete(
      PipelineStage.DRY_RUN_COMPLETED,
      [
        {
          role: 'system',
          content:
            'Выполни пробный запуск тест-кейсов. Верни только JSON без markdown-обёртки с результатами.',
        },
        {
          role: 'user',
          content: JSON.stringify(testcasesArtifact?.content || {}),
        },
      ],
    );

    let parsed: any;
    try {
      parsed = this.parseJsonResponse(response.content);
    } catch {
      parsed = { dryRun: response.content };
    }

    await this.featuresService.upsertArtifact(
      featureId,
      ArtifactType.DRY_RUN,
      parsed,
    );

    // Ждём апрува перед publish
    return {
      stage: PipelineStage.DRY_RUN_COMPLETED,
      status: 'waiting_for_qa',
      output: parsed,
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

    const response = await this.llmService.complete(
      PipelineStage.TEST_CASES_CREATED,
      [
        {
          role: 'system',
          content: `Ты агент Test Case Designer.
Аудит покрытия выявил пробелы — нужны дополнительные тест-кейсы.

Задача: для каждого пробела создай один тест-кейс.
Не дублируй существующие кейсы.

Формат каждого тест-кейса:
- id: TC-### (используй нумерацию начиная с ${maxExistingId + 1})
- title: краткое название
- section: секция
- priority: high|medium|low
- type: positive|negative|boundary|validation|permission|integration|regression
- status: draft
- automation_candidate: true
- preconditions: условия
- steps: [{ action, expected }]
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
            existingCaseCount: existingCases.length,
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

    // Auto-reaudit coverage
    return this.auditCoverage(featureId, {});
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
