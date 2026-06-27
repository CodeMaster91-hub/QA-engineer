import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentsService } from './agents.service';
import { PipelineStage } from '../pipeline/pipeline.entity';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(
    private configService: ConfigService,
    private agentsService: AgentsService,
  ) {}

  private getBaseUrl(): string {
    return this.configService.get<string>('LLM_BASE_URL', '');
  }

  private getApiKey(): string {
    return this.configService.get<string>('LLM_API_KEY', '');
  }

  private isMock(): boolean {
    return this.configService.get<string>('LLM_MOCK', 'true') === 'true';
  }

  async complete(
    stage: PipelineStage,
    messages: LLMMessage[],
  ): Promise<LLMResponse> {
    const config = await this.agentsService.getConfigForStage(stage);

    if (this.isMock()) {
      return this.mockComplete(messages);
    }

    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    if (!baseUrl) {
      throw new Error('LLM_BASE_URL is not configured');
    }

    this.logger.log(
      `LLM request: stage=${stage}, alias=${config.alias}, tokens=${config.maxTokens}`,
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.alias,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`LLM API error: ${response.status} - ${error}`);
      this.logger.error(
        `LLM request body: model=${config.alias}, temperature=${config.temperature}, max_tokens=${config.maxTokens}`,
      );

      if (response.status === 400 && error.includes('not a valid model ID')) {
        throw new Error(
          `Invalid LLM model: "${config.alias}". Check LLM_MODEL or LLM_ALIAS_* in .env`,
        );
      }

      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  private mockComplete(messages: LLMMessage[]): LLMResponse {
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

    let mockData: any;

    if (systemPrompt.includes('Requirements Analyst') || systemPrompt.includes('требований')) {
      mockData = {
        requirements: [
          { id: 'REQ-001', title: 'Тип домена', description: 'Добавить тип "Приватный домен"', priority: 'high', type: 'functional' },
          { id: 'REQ-002', title: 'Редирект', description: 'Редирект проверенных пользователей', priority: 'high', type: 'functional' },
          { id: 'REQ-003', title: 'Категория', description: 'Проверять user_category.id = 32', priority: 'medium', type: 'functional' },
        ],
        open_questions: [],
      };
    } else if (systemPrompt.includes('Test') || systemPrompt.includes('тест')) {
      mockData = {
        cases: [
          { id: 'TC-001', title: 'Редирект проверенного пользователя', status: 'draft', requirement_ids: ['REQ-001', 'REQ-002'], steps: [{ action: 'Авторизоваться', expected: 'Токен получен' }], priority: 'high', type: 'positive' },
          { id: 'TC-002', title: 'Блокировка при заблокированном домене', status: 'draft', requirement_ids: ['REQ-001'], steps: [{ action: 'Заблокировать домен', expected: 'Редирект не происходит' }], priority: 'medium', type: 'negative' },
          { id: 'TC-003', title: 'Отсутствие редиректа без категории', status: 'draft', requirement_ids: ['REQ-003'], steps: [{ action: 'Авторизоваться без категории', expected: 'Пользователь остаётся' }], priority: 'medium', type: 'negative' },
        ],
      };
    } else if (systemPrompt.includes('Coverage') || systemPrompt.includes('покрыти')) {
      mockData = {
        coverage: {
          requirements_coverage: [
            { requirement_id: 'REQ-001', status: 'Covered', covered_by: ['TC-001', 'TC-002'] },
            { requirement_id: 'REQ-002', status: 'Covered', covered_by: ['TC-001'] },
            { requirement_id: 'REQ-003', status: 'Covered', covered_by: ['TC-003'] },
          ],
        },
        coverage_matrix_markdown: '| REQ | Status | Covered by |\n|-----|--------|------------|\n| REQ-001 | Covered | TC-001, TC-002 |\n| REQ-002 | Covered | TC-001 |\n| REQ-003 | Covered | TC-003 |',
        gaps: [],
      };
    } else if (systemPrompt.includes('ревью') || systemPrompt.includes('review') || systemPrompt.includes('Review')) {
      mockData = {
        review: { quality: 'good', completeness: 'high', issues: [] },
      };
    } else if (systemPrompt.includes('пробный') || systemPrompt.includes('dry') || systemPrompt.includes('Dry') || systemPrompt.includes('Распредели')) {
      mockData = {
        cases: [
          { id: 'TC-001', title: 'Редирект проверенного пользователя', status: 'approved', targetSectionId: '1', targetSectionName: null },
          { id: 'TC-002', title: 'Блокировка при заблокированном домене', status: 'approved', targetSectionId: '1', targetSectionName: null },
          { id: 'TC-003', title: 'Отсутствие редиректа без категории', status: 'draft', targetSectionId: null, targetSectionName: 'Валидация формы' },
        ],
        newSections: [
          { name: 'Валидация формы', parentSectionId: null },
        ],
      };
    } else {
      mockData = { message: 'Mock response' };
    }

    return {
      content: JSON.stringify(mockData),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };
  }
}
