import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AgentsService } from './agents.service';
import { AgentConfig, PipelineStage } from './agent-config.entity';

describe('AgentsService', () => {
  let service: AgentsService;
  let agentConfigRepository: any;
  let configService: any;

  const mockConfig = {
    id: '1',
    stage: PipelineStage.REQUIREMENTS_EXTRACTED,
    alias: 'default',
    provider: 'custom',
    temperature: 0.1,
    maxTokens: 4096,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    agentConfigRepository = {
      find: jest.fn().mockResolvedValue([mockConfig]),
      findOne: jest.fn().mockResolvedValue(mockConfig),
      create: jest.fn().mockReturnValue(mockConfig),
      save: jest.fn().mockResolvedValue(mockConfig),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          LLM_DEFAULT_ALIAS: 'default',
          LLM_ALIAS_REQUIREMENTS: 'default',
          LLM_ALIAS_DRAFT: 'default',
          LLM_ALIAS_COVERAGE: 'default',
          LLM_ALIAS_REVIEW: 'default',
          LLM_ALIAS_DRY_RUN: 'default',
          LLM_PROVIDER_ID: 'custom',
          LLM_PROVIDER_NAME: 'Custom LLM',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: getRepositoryToken(AgentConfig), useValue: agentConfigRepository },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all configs', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockConfig]);
      expect(agentConfigRepository.find).toHaveBeenCalled();
    });
  });

  describe('findByStage', () => {
    it('should return config by stage', async () => {
      const result = await service.findByStage(PipelineStage.REQUIREMENTS_EXTRACTED);
      expect(result).toEqual(mockConfig);
      expect(agentConfigRepository.findOne).toHaveBeenCalledWith({
        where: { stage: PipelineStage.REQUIREMENTS_EXTRACTED },
      });
    });
  });

  describe('getConfigForStage', () => {
    it('should return config for enabled stage', async () => {
      const result = await service.getConfigForStage(PipelineStage.REQUIREMENTS_EXTRACTED);
      expect(result.alias).toBe('default');
      expect(result.temperature).toBe(0.1);
      expect(result.maxTokens).toBe(4096);
    });

    it('should return default config for disabled stage', async () => {
      agentConfigRepository.findOne.mockResolvedValue({ ...mockConfig, enabled: false });
      const result = await service.getConfigForStage(PipelineStage.REQUIREMENTS_EXTRACTED);
      expect(result.alias).toBe('default');
      expect(result.temperature).toBe(0.1);
    });
  });

  describe('getProviders', () => {
    it('should return providers with aliases', () => {
      const result = service.getProviders();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('custom');
      expect(result[0].name).toBe('Custom LLM');
      expect(result[0].aliases).toContain('default');
    });
  });
});
