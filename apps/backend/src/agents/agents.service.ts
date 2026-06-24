import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AgentConfig, PipelineStage } from './agent-config.entity';

@Injectable()
export class AgentsService implements OnModuleInit {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(AgentConfig)
    private agentConfigRepository: Repository<AgentConfig>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultConfigs();
  }

  private async seedDefaultConfigs() {
    const defaultAlias = this.configService.get<string>(
      'LLM_DEFAULT_ALIAS',
      'default',
    );

    const defaultConfigs = [
      {
        stage: PipelineStage.REQUIREMENTS_EXTRACTED,
        alias: this.configService.get<string>(
          'LLM_ALIAS_REQUIREMENTS',
          defaultAlias,
        ),
        provider: this.configService.get<string>('LLM_PROVIDER_ID', 'custom'),
        temperature: 0.1,
        maxTokens: 4096,
      },
      {
        stage: PipelineStage.TEST_PLAN_CREATED,
        alias: this.configService.get<string>(
          'LLM_ALIAS_TEST_PLAN',
          defaultAlias,
        ),
        provider: this.configService.get<string>('LLM_PROVIDER_ID', 'custom'),
        temperature: 0.2,
        maxTokens: 8192,
      },
      {
        stage: PipelineStage.TEST_CASES_CREATED,
        alias: this.configService.get<string>(
          'LLM_ALIAS_TEST_CASES',
          defaultAlias,
        ),
        provider: this.configService.get<string>('LLM_PROVIDER_ID', 'custom'),
        temperature: 0.2,
        maxTokens: 8192,
      },
      {
        stage: PipelineStage.COVERAGE_AUDITED,
        alias: this.configService.get<string>(
          'LLM_ALIAS_COVERAGE',
          defaultAlias,
        ),
        provider: this.configService.get<string>('LLM_PROVIDER_ID', 'custom'),
        temperature: 0.2,
        maxTokens: 4096,
      },
      {
        stage: PipelineStage.REVIEW,
        alias: this.configService.get<string>(
          'LLM_ALIAS_REVIEW',
          defaultAlias,
        ),
        provider: this.configService.get<string>('LLM_PROVIDER_ID', 'custom'),
        temperature: 0.1,
        maxTokens: 4096,
      },
      {
        stage: PipelineStage.DRY_RUN,
        alias: this.configService.get<string>(
          'LLM_ALIAS_DRY_RUN',
          defaultAlias,
        ),
        provider: this.configService.get<string>('LLM_PROVIDER_ID', 'custom'),
        temperature: 0.1,
        maxTokens: 4096,
      },
    ];

    for (const config of defaultConfigs) {
      const existing = await this.agentConfigRepository.findOne({
        where: { stage: config.stage },
      });
      if (!existing) {
        await this.agentConfigRepository.save(
          this.agentConfigRepository.create(config),
        );
        this.logger.log(`Seeded config for stage: ${config.stage}`);
      }
    }
  }

  async findAll(): Promise<AgentConfig[]> {
    return this.agentConfigRepository.find({ order: { stage: 'ASC' } });
  }

  async findByStage(stage: PipelineStage): Promise<AgentConfig | null> {
    return this.agentConfigRepository.findOne({ where: { stage } });
  }

  async update(
    stage: PipelineStage,
    updateDto: Partial<AgentConfig>,
  ): Promise<AgentConfig> {
    let config = await this.findByStage(stage);
    if (!config) {
      config = this.agentConfigRepository.create({ stage, ...updateDto });
    } else {
      Object.assign(config, updateDto);
    }
    return this.agentConfigRepository.save(config);
  }

  async getConfigForStage(
    stage: PipelineStage,
  ): Promise<{ alias: string; temperature: number; maxTokens: number }> {
    const config = await this.findByStage(stage);
    if (!config || !config.enabled) {
      const defaultAlias = this.configService.get<string>(
        'LLM_DEFAULT_ALIAS',
        'default',
      );
      return {
        alias: defaultAlias,
        temperature: 0.1,
        maxTokens: 4096,
      };
    }
    return {
      alias: config.alias,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };
  }

  getProviders(): Array<{ id: string; name: string; aliases: string[] }> {
    const aliases = [
      this.configService.get<string>('LLM_DEFAULT_ALIAS', 'default'),
      this.configService.get<string>('LLM_ALIAS_REQUIREMENTS', ''),
      this.configService.get<string>('LLM_ALIAS_TEST_PLAN', ''),
      this.configService.get<string>('LLM_ALIAS_TEST_CASES', ''),
      this.configService.get<string>('LLM_ALIAS_COVERAGE', ''),
      this.configService.get<string>('LLM_ALIAS_REVIEW', ''),
      this.configService.get<string>('LLM_ALIAS_DRY_RUN', ''),
    ].filter((a): a is string => Boolean(a));

    return [
      {
        id: this.configService.get<string>('LLM_PROVIDER_ID', 'custom'),
        name: this.configService.get<string>('LLM_PROVIDER_NAME', 'Custom LLM'),
        aliases: [...new Set(aliases)],
      },
    ];
  }
}
