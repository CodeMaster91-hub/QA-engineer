import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable } from 'rxjs';

export interface SseEvent {
  type: string;
  data: any;
  timestamp: Date;
  id?: string;
}

export interface PipelineProgressEvent {
  featureId: string;
  featureSlug: string;
  stage: string;
  progress: number;
  total: number;
  status: 'running' | 'completed' | 'failed';
}

export interface PipelineCompletedEvent {
  featureId: string;
  featureSlug: string;
  result: any;
}

export interface PipelineFailedEvent {
  featureId: string;
  featureSlug: string;
  error: string;
}

export interface PipelineLogEvent {
  featureId: string;
  featureSlug: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export interface TestRailProgressEvent {
  featureId: string;
  featureSlug: string;
  status: 'publishing' | 'completed' | 'failed';
  progress?: number;
}

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private redis: any = null;
  private redisSub: any = null;
  private subjects = new Map<string, Subject<SseEvent>>();
  private channelPrefix = 'qa-platform:events:';
  private redisEnabled: boolean;
  private localMode: boolean;

  // Ring-buffer: последние события per featureId для replay
  private eventHistory = new Map<string, SseEvent[]>();
  private MAX_HISTORY = 100;

  constructor(private configService: ConfigService) {
    this.redisEnabled = this.configService.get<string>('REDIS_ENABLED', 'false') === 'true';

    if (this.redisEnabled) {
      this.initRedis();
      this.localMode = false;
    } else {
      this.logger.warn('Redis disabled - running in local mode (no multi-pod support)');
      this.localMode = true;
    }
  }

  private async initRedis() {
    try {
      let Redis: any;
      try {
        const ioredis = await import('ioredis' as string);
        Redis = ioredis.default || ioredis;
      } catch {
        this.logger.warn('ioredis not installed, using local mode');
        this.localMode = true;
        return;
      }

      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');

      const redisConfig: any = { host, port };
      if (password) {
        redisConfig.password = password;
      }

      this.redis = new Redis(redisConfig);
      this.redisSub = new Redis(redisConfig);

      this.redisSub.on('connect', () => {
        this.logger.log('Redis Pub/Sub connected');
      });

      this.redisSub.on('error', (error: any) => {
        this.logger.error('Redis Pub/Sub error:', error);
        this.logger.warn('Falling back to local mode');
        this.localMode = true;
      });

      this.redisSub.on('message', (channel: string, message: string) => {
        this.handleRedisMessage(channel, message);
      });
    } catch (error) {
      this.logger.warn('Failed to connect Redis, using local mode');
      this.redis = null;
      this.redisSub = null;
      this.localMode = true;
    }
  }

  private handleRedisMessage(channel: string, message: string) {
    try {
      const event: SseEvent = JSON.parse(message);
      const channelName = channel.replace(this.channelPrefix, '');
      const subject = this.subjects.get(channelName);
      if (subject) {
        subject.next(event);
      }
    } catch (error) {
      this.logger.error('Failed to parse Redis message:', error);
    }
  }

  getObservable(featureId: string): Observable<SseEvent> {
    if (!this.subjects.has(featureId)) {
      const subject = new Subject<SseEvent>();
      this.subjects.set(featureId, subject);

      if (!this.localMode && this.redisSub) {
        const channel = `${this.channelPrefix}${featureId}`;
        this.redisSub.subscribe(channel, (err: any) => {
          if (err) {
            this.logger.error(`Failed to subscribe to ${channel}:`, err);
          }
        });
      }
    }

    return this.subjects.get(featureId)!.asObservable();
  }

  async emit(featureId: string, event: SseEvent) {
    // Генерируем ID для replay
    const eventWithId: SseEvent = {
      ...event,
      id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    // Сохраняем в ring-buffer
    if (!this.eventHistory.has(featureId)) {
      this.eventHistory.set(featureId, []);
    }
    const history = this.eventHistory.get(featureId)!;
    history.push(eventWithId);
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }

    // Пушим в live subscribers
    const subject = this.subjects.get(featureId);
    if (subject) {
      subject.next(eventWithId);
    }

    // Redis pub/sub для multi-pod
    if (!this.localMode && this.redis) {
      const channel = `${this.channelPrefix}${featureId}`;
      await this.redis.publish(channel, JSON.stringify(eventWithId));
    }
  }

  /**
   * Replay пропущенных событий при переподключении SSE.
   * Возвращает события новее lastEventId.
   */
  getReplayEvents(featureId: string, since?: string): SseEvent[] {
    const history = this.eventHistory.get(featureId) || [];
    if (!since) {
      // При первом подключении — последние 20 событий
      return history.slice(-20);
    }
    // При переподключении — события новее since
    const sinceNum = parseInt(since, 10);
    if (isNaN(sinceNum)) {
      return history.slice(-20);
    }
    return history.filter((e) => {
      const eventId = e.id || '';
      const eventNum = parseInt(eventId.split('-')[0], 10);
      return eventNum > sinceNum;
    });
  }

  async emitPipelineProgress(data: PipelineProgressEvent) {
    await this.emit(data.featureId, {
      type: 'pipeline:progress',
      data,
      timestamp: new Date(),
    });
  }

  async emitPipelineCompleted(data: PipelineCompletedEvent) {
    await this.emit(data.featureId, {
      type: 'pipeline:completed',
      data,
      timestamp: new Date(),
    });
  }

  async emitPipelineFailed(data: PipelineFailedEvent) {
    await this.emit(data.featureId, {
      type: 'pipeline:failed',
      data,
      timestamp: new Date(),
    });
  }

  async emitPipelineLog(data: PipelineLogEvent) {
    await this.emit(data.featureId, {
      type: 'pipeline:log',
      data,
      timestamp: new Date(),
    });
  }

  async emitTestRailProgress(data: TestRailProgressEvent) {
    await this.emit(data.featureId, {
      type: 'testrail:progress',
      data,
      timestamp: new Date(),
    });
  }

  async emitPipelineBlocked(data: { featureId: string; featureSlug: string; stage: string; questions: any[] }) {
    await this.emit(data.featureId, {
      type: 'pipeline:blocked',
      data,
      timestamp: new Date(),
    });
  }

  async emitPipelineWaitingForQa(data: { featureId: string; featureSlug: string; stage: string; coverageGaps?: string[] }) {
    await this.emit(data.featureId, {
      type: 'pipeline:waiting_for_qa',
      data,
      timestamp: new Date(),
    });
  }

  isLocalMode(): boolean {
    return this.localMode;
  }

  onModuleDestroy() {
    this.subjects.forEach((subject) => subject.complete());
    this.subjects.clear();
    this.eventHistory.clear();

    if (this.redisSub) {
      this.redisSub.disconnect();
    }
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
