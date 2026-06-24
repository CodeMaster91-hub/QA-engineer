import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentsService } from './agents.service';
import { PipelineStage } from './agent-config.entity';

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
    const lastMessage = messages[messages.length - 1];
    return {
      content: `[MOCK] Обработка запроса: "${lastMessage.content.substring(0, 100)}..."`,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };
  }
}
