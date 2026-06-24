import { Test, TestingModule } from '@nestjs/testing';
import { PipelineService } from './pipeline.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Pipeline } from './pipeline.entity';
import { FeaturesService } from '../features/features.service';
import { EventsService } from '../events/events.service';
import { QueueService } from '../common/queue/in-memory-queue';
import { WorkflowEngine } from './workflow.engine';
import { StageStatus } from './pipeline.stage-status.enum';

describe('PipelineService', () => {
  let service: PipelineService;
  let eventsService: EventsService;
  let pipelineRepo: any;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const mockEvents = { emit: jest.fn() } as any;
    const mockQueue = { add: jest.fn() } as any;
    const mockQueueService = { getQueue: jest.fn().mockReturnValue(mockQueue) } as any;
    const mockWorkflow = { getNextStage: jest.fn().mockReturnValue('draft_created') } as any;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: getRepositoryToken(Pipeline), useValue: mockRepo },
        { provide: EventsService, useValue: mockEvents },
        { provide: QueueService, useValue: mockQueueService },
        { provide: WorkflowEngine, useValue: mockWorkflow },
        { provide: FeaturesService, useValue: { findBySlug: jest.fn() } },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
    eventsService = module.get<EventsService>(EventsService);
    pipelineRepo = mockRepo;
  });

  it('should emit stage-update on completed stage transition', async () => {
    const pipeline = {
      id: 'pid',
      featureId: 'fid',
      feature: { slug: 'my-feature' } as any,
      stageResults: {},
      currentStage: 'requirements_extracted' as any,
      status: 'running',
    } as any;
    pipelineRepo.findOne.mockResolvedValue(pipeline);

    await service.handleStageResult('pid', 'requirements_extracted' as any, { status: 'completed' });

    expect(eventsService.emit).toHaveBeenCalledWith('fid', expect.objectContaining({
      type: 'pipeline:stage-update',
      data: expect.objectContaining({ stage: 'draft_created', status: StageStatus.Running }),
    }));
  });
});
