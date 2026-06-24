import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngine } from './workflow.engine';
import { LLMService } from '../agents/llm.service';
import { FeaturesService } from '../features/features.service';
import { PipelineStage } from './pipeline.entity';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let llmService: any;
  let featuresService: any;

  beforeEach(async () => {
    llmService = {
      complete: jest.fn().mockResolvedValue({
        content: '{"title": "Test Feature", "slug": "test-feature"}',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }),
    };

    featuresService = {
      findBySlug: jest.fn().mockResolvedValue({ id: '1', slug: 'test-feature' }),
      getArtifact: jest.fn().mockResolvedValue({ content: { text: 'Test content' } }),
      upsertArtifact: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngine,
        { provide: LLMService, useValue: llmService },
        { provide: FeaturesService, useValue: featuresService },
      ],
    }).compile();

    engine = module.get<WorkflowEngine>(WorkflowEngine);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('executeStage', () => {
    it('should execute source_ingested stage', async () => {
      const result = await engine.executeStage(
        PipelineStage.SOURCE_INGESTED,
        'test-feature',
        {},
      );
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should execute requirements_extracted stage', async () => {
      const result = await engine.executeStage(
        PipelineStage.REQUIREMENTS_EXTRACTED,
        'test-feature',
        {},
      );
      expect(llmService.complete).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getNextStage', () => {
    it('should return next stage', () => {
      const next = engine.getNextStage(PipelineStage.NEW);
      expect(next).toBe(PipelineStage.SOURCE_INGESTED);
    });

    it('should return null for last stage', () => {
      const next = engine.getNextStage(PipelineStage.PUBLISHED);
      expect(next).toBeNull();
    });
  });
});
