import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Pipeline,
  PipelineStatus,
  PipelineStage,
  PIPELINE_STAGE_ORDER,
} from './pipeline.entity';
import { WorkflowEngine } from './workflow.engine';
import { EventsService } from '../events/events.service';
import { StageStatus } from './pipeline.stage-status.enum';
import { FeaturesService } from '../features/features.service';
import { QueueService, InMemoryQueue } from '../common/queue/in-memory-queue';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);
  private pipelineQueue: InMemoryQueue;

  constructor(
    @InjectRepository(Pipeline)
    private pipelineRepository: Repository<Pipeline>,
    private queueService: QueueService,
    private workflowEngine: WorkflowEngine,
    private featuresService: FeaturesService,
    private eventsService: EventsService,
  ) {
    this.pipelineQueue = this.queueService.getQueue('pipeline');
  }

  async findByFeatureSlug(slug: string): Promise<Pipeline> {
    const feature = await this.featuresService.findBySlug(slug);
    let pipeline = await this.pipelineRepository.findOne({
      where: { featureId: feature.id },
    });
    if (!pipeline) {
      pipeline = this.pipelineRepository.create({
        featureId: feature.id,
        status: PipelineStatus.IDLE,
        currentStage: PipelineStage.NEW,
        stageResults: {},
        questions: [],
        blockedStage: null,
        coverageGaps: null,
      });
      pipeline = await this.pipelineRepository.save(pipeline);
    }
    return pipeline;
  }

  async run(slug: string): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status === PipelineStatus.RUNNING) {
      throw new BadRequestException('Pipeline is already running');
    }

    pipeline.status = PipelineStatus.RUNNING;
    pipeline.retryCount = 0;
    pipeline.error = '';
    pipeline.questions = [];
    pipeline.blockedStage = null;
    pipeline.coverageGaps = null;
    await this.pipelineRepository.save(pipeline);

    await this.eventsService.emit(pipeline.featureId, {
      type: 'pipeline:stage-update',
      data: { stage: pipeline.currentStage, status: StageStatus.Running },
      timestamp: new Date(),
    });

    await this.pipelineQueue.add({
      pipelineId: pipeline.id,
      featureSlug: slug,
      stage: pipeline.currentStage,
    });

    this.logger.log(`Pipeline started for feature: ${slug}`);
    return pipeline;
  }

  async restart(slug: string, fromStage?: PipelineStage): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status === PipelineStatus.RUNNING) {
      throw new BadRequestException('Pipeline is already running');
    }

    pipeline.status = PipelineStatus.IDLE;
    pipeline.currentStage = fromStage || PipelineStage.NEW;
    pipeline.stageResults = {};
    pipeline.error = '';
    pipeline.retryCount = 0;
    pipeline.questions = [];
    pipeline.blockedStage = null;
    pipeline.coverageGaps = null;
    await this.pipelineRepository.save(pipeline);

    return this.run(slug);
  }

  async continue(slug: string): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status !== PipelineStatus.PAUSED) {
      throw new BadRequestException('Pipeline is not paused');
    }

    return this.run(slug);
  }

  async cancel(slug: string): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status !== PipelineStatus.RUNNING) {
      throw new BadRequestException('Pipeline is not running');
    }

    pipeline.status = PipelineStatus.CANCELLED;
    await this.pipelineRepository.save(pipeline);

    const jobs = await this.pipelineQueue.getJobs();
    for (const job of jobs) {
      if (job.data.pipelineId === pipeline.id) {
        job.status = 'failed';
        job.error = 'Cancelled';
      }
    }

    this.logger.log(`Pipeline cancelled for feature: ${slug}`);
    return pipeline;
  }

  async approveStage(slug: string): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status !== PipelineStatus.WAITING_FOR_QA) {
      throw new BadRequestException('Pipeline is not waiting for approval');
    }

    const currentStage = pipeline.currentStage;

    // Закрыть текущий этап как completed
    pipeline.stageResults[currentStage] = {
      ...pipeline.stageResults[currentStage],
      status: 'completed',
    };

    // Найти следующий этап
    const nextStage = this.workflowEngine.getNextStage(currentStage as PipelineStage);

    if (nextStage) {
      // Перейти к следующему
      pipeline.status = PipelineStatus.RUNNING;
      pipeline.currentStage = nextStage;
      pipeline.blockedStage = null;
      pipeline.coverageGaps = null;
      await this.pipelineRepository.save(pipeline);

      // Запустить следующий этап
      await this.pipelineQueue.add({
        pipelineId: pipeline.id,
        featureId: pipeline.featureId,
        featureSlug: slug,
        stage: nextStage,
      });

      await this.eventsService.emit(pipeline.featureId, {
        type: 'pipeline:stage-update',
        data: { stage: nextStage, status: StageStatus.Running },
        timestamp: new Date(),
      });
    } else {
      // Финал
      pipeline.status = PipelineStatus.COMPLETED;
      pipeline.blockedStage = null;
      pipeline.coverageGaps = null;
      await this.pipelineRepository.save(pipeline);

      await this.eventsService.emit(pipeline.featureId, {
        type: 'pipeline:completed',
        data: { featureSlug: slug },
        timestamp: new Date(),
      });
    }

    this.logger.log(`Pipeline stage approved: ${currentStage} → ${nextStage || 'completed'}`);
    return pipeline;
  }

  async answerQuestions(slug: string): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status !== PipelineStatus.BLOCKED) {
      throw new BadRequestException('Pipeline is not blocked');
    }

    const currentStage = pipeline.currentStage;
    const currentIdx = PIPELINE_STAGE_ORDER.indexOf(currentStage);
    const nextStage = currentIdx >= 0 && currentIdx < PIPELINE_STAGE_ORDER.length - 1
      ? PIPELINE_STAGE_ORDER[currentIdx + 1]
      : null;

    pipeline.stageResults[currentStage] = {
      ...pipeline.stageResults[currentStage],
      status: 'completed',
    };

    pipeline.blockedStage = null;
    pipeline.questions = [];

    if (nextStage) {
      pipeline.currentStage = nextStage;
      pipeline.status = PipelineStatus.RUNNING;
      await this.pipelineRepository.save(pipeline);

      await this.pipelineQueue.add({
        pipelineId: pipeline.id,
        featureId: pipeline.featureId,
        featureSlug: slug,
        stage: nextStage,
      });

      await this.eventsService.emit(pipeline.featureId, {
        type: 'pipeline:stage-update',
        data: { stage: nextStage, status: StageStatus.Running },
        timestamp: new Date(),
      });

      this.logger.log(`Pipeline questions answered, advancing: ${currentStage} → ${nextStage}`);
    } else {
      pipeline.status = PipelineStatus.COMPLETED;
      await this.pipelineRepository.save(pipeline);

      await this.eventsService.emit(pipeline.featureId, {
        type: 'pipeline:completed',
        data: { stage: currentStage },
        timestamp: new Date(),
      });

      this.logger.log(`Pipeline questions answered, completed at: ${currentStage}`);
    }

    return pipeline;
  }

  async restartStage(slug: string, stage: PipelineStage): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status === PipelineStatus.RUNNING) {
      throw new BadRequestException('Pipeline is already running');
    }

    // Удалить результат только этого этапа
    delete pipeline.stageResults[stage];

    // Установить текущий этап
    pipeline.currentStage = stage;
    pipeline.status = PipelineStatus.RUNNING;
    pipeline.error = '';
    await this.pipelineRepository.save(pipeline);

    // Запустить этап
    await this.pipelineQueue.add({
      pipelineId: pipeline.id,
      featureId: pipeline.featureId,
      featureSlug: slug,
      stage,
    });

    await this.eventsService.emit(pipeline.featureId, {
      type: 'pipeline:stage-update',
      data: { stage, status: StageStatus.Running },
      timestamp: new Date(),
    });

    this.logger.log(`Pipeline stage restarted: ${stage}`);
    return pipeline;
  }

  async fillGaps(slug: string, gaps: string[]): Promise<Pipeline> {
    const pipeline = await this.findByFeatureSlug(slug);

    if (pipeline.status !== PipelineStatus.WAITING_FOR_QA) {
      throw new BadRequestException('Pipeline is not waiting for QA approval');
    }
    if (pipeline.blockedStage !== PipelineStage.COVERAGE_AUDITED) {
      throw new BadRequestException('Fill gaps is only available at coverage_audited stage');
    }

    if (!gaps.length) {
      throw new BadRequestException('No gaps provided');
    }

    pipeline.status = PipelineStatus.RUNNING;
    pipeline.coverageGaps = null;
    await this.pipelineRepository.save(pipeline);

    await this.eventsService.emit(pipeline.featureId, {
      type: 'pipeline:fill-gaps-started',
      data: { gapsCount: gaps.length },
      timestamp: new Date(),
    });

    const result = await this.workflowEngine.fillGaps(pipeline.featureId, gaps);

    await this.eventsService.emit(pipeline.featureId, {
      type: 'pipeline:fill-gaps-done',
      data: { success: result.status === 'completed', error: result.error || null },
      timestamp: new Date(),
    });

    if (result.status === 'completed') {
      pipeline.status = PipelineStatus.RUNNING;
      pipeline.currentStage = PipelineStage.COVERAGE_AUDITED;
      delete pipeline.stageResults[PipelineStage.COVERAGE_AUDITED];
      await this.pipelineRepository.save(pipeline);

      const featureSlug = (pipeline as any).feature?.slug || slug;
      await this.pipelineQueue.add({
        pipelineId: pipeline.id,
        featureId: pipeline.featureId,
        featureSlug,
        stage: PipelineStage.COVERAGE_AUDITED,
      });
    } else {
      pipeline.status = PipelineStatus.FAILED;
      pipeline.error = result.error || 'Failed to fill gaps';
      await this.pipelineRepository.save(pipeline);

      await this.eventsService.emit(pipeline.featureId, {
        type: 'pipeline:failed',
        data: { stage: PipelineStage.TEST_CASES_CREATED, error: result.error },
        timestamp: new Date(),
      });
    }

    return this.findByFeatureSlug(slug);
  }

  async getStatus(slug: string): Promise<Pipeline> {
    return this.findByFeatureSlug(slug);
  }

  async handleStageResult(
    pipelineId: string,
    stage: PipelineStage,
    result: any,
  ): Promise<void> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
      relations: ['feature'],
    });
    if (!pipeline) return;

    pipeline.stageResults[stage] = result;
    const featureSlug = (pipeline as any).feature?.slug || '';

    if (result.status === 'completed') {
      const nextStage = this.workflowEngine.getNextStage(stage);
      if (nextStage) {
        const nextResult = pipeline.stageResults[nextStage];
        const nextStatus = nextResult?.status;

        if (nextStatus === 'completed' || nextStatus === 'waiting_for_qa' || nextStatus === 'blocked') {
          pipeline.currentStage = nextStage;
          pipeline.status = PipelineStatus.WAITING_FOR_QA;
          pipeline.blockedStage = nextStage;
          await this.pipelineRepository.save(pipeline);
          this.logger.log(`Stage ${stage} completed, restored ${nextStage} status (not re-running)`);
        } else {
          pipeline.currentStage = nextStage;
          await this.pipelineRepository.save(pipeline);

          await this.pipelineQueue.add({
            pipelineId: pipeline.id,
            featureId: pipeline.featureId,
            featureSlug,
            stage: nextStage,
          });
        }
      } else {
        pipeline.status = PipelineStatus.COMPLETED;
        await this.pipelineRepository.save(pipeline);
        await this.eventsService.emit(pipeline.featureId, {
          type: 'pipeline:completed',
          data: { featureSlug },
          timestamp: new Date(),
        });
        this.logger.log(`Pipeline completed for feature: ${pipeline.featureId}`);
      }
    } else if (result.status === 'blocked') {
      // Pipeline заблокирован вопросами
      pipeline.status = PipelineStatus.BLOCKED;
      pipeline.blockedStage = stage;
      pipeline.questions = result.questions || [];
      await this.pipelineRepository.save(pipeline);

      await this.eventsService.emit(pipeline.featureId, {
        type: 'pipeline:blocked',
        data: { stage, questions: result.questions },
        timestamp: new Date(),
      });

      this.logger.log(`Pipeline blocked at ${stage}: ${result.questions?.length || 0} questions`);
    } else if (result.status === 'waiting_for_qa') {
      // Pipeline ждёт апрува QA
      pipeline.status = PipelineStatus.WAITING_FOR_QA;
      pipeline.blockedStage = stage;
      pipeline.coverageGaps = result.coverageGaps || null;
      await this.pipelineRepository.save(pipeline);

      await this.eventsService.emit(pipeline.featureId, {
        type: 'pipeline:waiting_for_qa',
        data: { stage, coverageGaps: result.coverageGaps },
        timestamp: new Date(),
      });

      this.logger.log(`Pipeline waiting for QA at ${stage}`);
    } else if (result.status === 'failed') {
      pipeline.retryCount++;
      if (pipeline.retryCount >= pipeline.maxRetries) {
        pipeline.status = PipelineStatus.FAILED;
        pipeline.error = result.error || '';
        await this.pipelineRepository.save(pipeline);
        await this.eventsService.emit(pipeline.featureId, {
          type: 'pipeline:failed',
          data: { stage, error: result.error },
          timestamp: new Date(),
        });
        this.logger.error(
          `Pipeline failed after ${pipeline.maxRetries} retries`,
        );
      } else {
        await this.pipelineRepository.save(pipeline);
        await this.pipelineQueue.add({
          pipelineId: pipeline.id,
          featureId: pipeline.featureId,
          featureSlug,
          stage,
        });
      }
    }
  }
}
