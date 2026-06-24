import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantService } from '../tenant/tenant.service';

export interface QueueJob {
  id: string;
  data: any;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  tenantId?: string;
}

export interface QueueProcessor {
  process(job: QueueJob): Promise<any>;
}

@Injectable()
export class InMemoryQueue {
  private readonly logger = new Logger(InMemoryQueue.name);
  private jobs = new Map<string, QueueJob>();
  private processors = new Map<string, QueueProcessor>();
  private processing = false;
  private queueName: string;
  private tenantId: string;

  constructor(queueName: string, tenantId: string = 'public') {
    this.queueName = queueName;
    this.tenantId = tenantId;
  }

  async add(data: any): Promise<QueueJob> {
    const job: QueueJob = {
      id: `${this.tenantId}:${this.queueName}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      data,
      status: 'waiting',
      createdAt: new Date(),
      tenantId: this.tenantId,
    };

    this.jobs.set(job.id, job);
    this.logger.log(`Job ${job.id} added to ${this.queueName} [tenant: ${this.tenantId}]`);

    this.processNext();

    return job;
  }

  async process(processor: QueueProcessor): Promise<void> {
    this.processors.set(this.queueName, processor);
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (true) {
      const waitingJobs = Array.from(this.jobs.values()).filter(
        (job) => job.status === 'waiting' && job.tenantId === this.tenantId
      );

      if (waitingJobs.length === 0) break;

      for (const job of waitingJobs) {
        if (job.status !== 'waiting') continue;

        const processor = this.processors.get(this.queueName);
        if (processor) {
          try {
            job.status = 'active';
            job.processedAt = new Date();

            const result = await processor.process(job);
            job.status = 'completed';
            job.result = result;

            this.logger.log(`Job ${job.id} completed [tenant: ${this.tenantId}]`);
          } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            this.logger.error(`Job ${job.id} failed: ${error.message} [tenant: ${this.tenantId}]`);
          }
        }
      }
    }

    this.processing = false;
  }

  async getJob(jobId: string): Promise<QueueJob | undefined> {
    return this.jobs.get(jobId);
  }

  async getJobs(): Promise<QueueJob[]> {
    return Array.from(this.jobs.values()).filter(
      (job) => job.tenantId === this.tenantId
    );
  }
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queues = new Map<string, InMemoryQueue>();
  private redisEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private tenantService: TenantService,
  ) {
    this.redisEnabled = this.configService.get<string>('REDIS_ENABLED', 'false') === 'true';
    
    if (!this.redisEnabled) {
      this.logger.warn('Running in in-memory queue mode (no persistence)');
    }
  }

  getQueue(name: string): InMemoryQueue {
    const tenantId = this.tenantService.getTenantId();
    const queueKey = `${tenantId}:${name}`;
    
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, new InMemoryQueue(name, tenantId));
    }
    return this.queues.get(queueKey)!;
  }

  isRedisEnabled(): boolean {
    return this.redisEnabled;
  }
}
