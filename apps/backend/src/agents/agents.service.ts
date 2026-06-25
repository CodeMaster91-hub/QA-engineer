import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AgentConfig } from './agent-config.entity';
import { PipelineStage } from '../pipeline/pipeline.entity';

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

  private resolveAlias(stageEnvKey: string): string {
    const stageAlias = this.configService.get<string>(stageEnvKey);
    if (stageAlias) return stageAlias;

    const model = this.configService.get<string>('LLM_MODEL');
    if (model) return model;

    const defaultAlias = this.configService.get<string>('LLM_DEFAULT_ALIAS', 'default');
    return defaultAlias;
  }

  private async seedDefaultConfigs() {
    const provider = this.configService.get<string>('LLM_PROVIDER_ID', 'custom');

    const defaultConfigs = [
      {
        stage: PipelineStage.REQUIREMENTS_EXTRACTED,
        aliasEnv: 'LLM_ALIAS_REQUIREMENTS',
        temperature: 0.1,
        maxTokens: 4096,
      },
      {
        stage: PipelineStage.TEST_PLAN_CREATED,
        aliasEnv: 'LLM_ALIAS_TEST_PLAN',
        temperature: 0.2,
        maxTokens: 8192,
      },
      {
        stage: PipelineStage.TEST_CASES_CREATED,
        aliasEnv: 'LLM_ALIAS_TEST_CASES',
        temperature: 0.2,
        maxTokens: 8192,
      },
      {
        stage: PipelineStage.COVERAGE_AUDITED,
        aliasEnv: 'LLM_ALIAS_COVERAGE',
        temperature: 0.2,
        maxTokens: 4096,
      },
      {
        stage: PipelineStage.REVIEW,
        aliasEnv: 'LLM_ALIAS_REVIEW',
        temperature: 0.1,
        maxTokens: 4096,
      },
      {
        stage: PipelineStage.DRY_RUN_COMPLETED,
        aliasEnv: 'LLM_ALIAS_DRY_RUN',
        temperature: 0.1,
        maxTokens: 4096,
      },
    ];

    for (const cfg of defaultConfigs) {
      const alias = this.resolveAlias(cfg.aliasEnv);
      const existing = await this.agentConfigRepository.findOne({
        where: { stage: cfg.stage },
      });

      if (!existing) {
        await this.agentConfigRepository.save(
          this.agentConfigRepository.create({
            stage: cfg.stage,
            alias,
            provider,
            temperature: cfg.temperature,
            maxTokens: cfg.maxTokens,
          }),
        );
        this.logger.log(`Seeded config for stage: ${cfg.stage} (alias: ${alias})`);
      } else {
        let changed = false;
        if (existing.alias !== alias) {
          existing.alias = alias;
          changed = true;
        }
        if (existing.provider !== provider) {
          existing.provider = provider;
          changed = true;
        }
        if (changed) {
          await this.agentConfigRepository.save(existing);
          this.logger.log(`Synced config for stage: ${cfg.stage} (alias: ${alias})`);
        }
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
      const alias = this.resolveAlias('');
      return {
        alias,
        temperature: 0.1,
        maxTokens: 4096,
      };
    }
    return {
      alias: config.alias,
      temperature: Number(config.temperature),
      maxTokens: Number(config.maxTokens),
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
