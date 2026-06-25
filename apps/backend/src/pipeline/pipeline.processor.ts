import { Injectable, Logger } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { WorkflowEngine } from './workflow.engine';
import { PipelineStage, PIPELINE_STAGE_ORDER } from './pipeline.entity';
import { EventsService } from '../events/events.service';
import { QueueService, InMemoryQueue } from '../common/queue/in-memory-queue';

@Injectable()
export class PipelineProcessor {
  private readonly logger = new Logger(PipelineProcessor.name);
  private queue: InMemoryQueue;

  constructor(
    private pipelineService: PipelineService,
    private workflowEngine: WorkflowEngine,
    private eventsService: EventsService,
    private queueService: QueueService,
  ) {
    this.queue = this.queueService.getQueue('pipeline');
    this.queue.process({
      process: (job) => this.processJob(job),
    });
  }

  async addJob(data: {
    pipelineId: string;
    featureId: string;
    featureSlug: string;
    stage: string;
  }) {
    return this.queue.add(data);
  }

  private async processJob(job: any): Promise<any> {
    const { pipelineId, featureId, featureSlug, stage } = job.data;

    this.logger.log(
      `Processing job ${job.id} for pipeline ${pipelineId}, stage: ${stage}`,
    );

    const stageIndex = PIPELINE_STAGE_ORDER.indexOf(stage as PipelineStage);
    const totalStages = PIPELINE_STAGE_ORDER.length;

    await this.eventsService.emitPipelineLog({
      featureId,
      featureSlug,
      message: `Starting stage: ${stage}`,
      level: 'info',
    });

    try {
      const pipeline = await this.pipelineService.findByFeatureSlug(featureSlug);

      await this.eventsService.emitPipelineProgress({
        featureId,
        featureSlug,
        stage,
        progress: stageIndex + 1,
        total: totalStages,
        status: 'running',
      });

      const result = await this.workflowEngine.executeStage(
        stage as PipelineStage,
        featureSlug,
        pipeline.stageResults || {},
      );

      await this.pipelineService.handleStageResult(pipelineId, stage, result);

      // Обработка blocked/waiting_for_qa
      if (result.status === 'blocked') {
        await this.eventsService.emitPipelineLog({
          featureId,
          featureSlug,
          message: `Stage ${stage} blocked: ${result.questions?.length || 0} questions require QA answers`,
          level: 'warn',
        });
        return result;
      }

      if (result.status === 'waiting_for_qa') {
        await this.eventsService.emitPipelineLog({
          featureId,
          featureSlug,
          message: `Stage ${stage} waiting for QA approval`,
          level: 'warn',
        });
        return result;
      }

      await this.eventsService.emitPipelineLog({
        featureId,
        featureSlug,
        message: `Completed stage: ${stage}`,
        level: 'info',
      });

      this.logger.log(`Job ${job.id} completed for stage: ${stage}`);
      return result;
    } catch (error) {
      await this.eventsService.emitPipelineLog({
        featureId,
        featureSlug,
        message: `Failed stage: ${stage} - ${error.message}`,
        level: 'error',
      });

      throw error;
    }
  }
}
