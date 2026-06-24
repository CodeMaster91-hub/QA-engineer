import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks?: Record<string, { status: string; message?: string }>;
}

@Injectable()
export class HealthService {
  constructor(
    private configService: ConfigService,
    private dataSource?: DataSource,
  ) {}

  getAlive(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async getReady(): Promise<HealthStatus> {
    const checks: Record<string, { status: string; message?: string }> = {};

    // Check PostgreSQL
    try {
      if (this.dataSource) {
        await this.dataSource.query('SELECT 1');
        checks.postgres = { status: 'ok' };
      } else {
        checks.postgres = { status: 'ok', message: 'datasource not available' };
      }
    } catch (error) {
      checks.postgres = { status: 'error', message: (error as Error).message };
    }

    // Check Redis (if enabled)
    const redisEnabled = this.configService.get<string>('REDIS_ENABLED', 'false') === 'true';
    if (redisEnabled) {
      checks.redis = { status: 'ok', message: 'enabled' };
    } else {
      checks.redis = { status: 'ok', message: 'disabled (in-memory)' };
    }

    const allOk = Object.values(checks).every(c => c.status === 'ok');

    return {
      status: allOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }

  getLive(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
