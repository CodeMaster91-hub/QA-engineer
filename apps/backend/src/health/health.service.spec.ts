import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let configService: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          REDIS_ENABLED: 'false',
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAlive', () => {
    it('should return ok status', () => {
      const result = service.getAlive();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe('getReady', () => {
    it('should return ok status when Redis disabled', async () => {
      const result = await service.getReady();
      expect(result.status).toBe('ok');
      expect(result.checks?.postgres).toBeDefined();
      expect(result.checks?.redis).toBeDefined();
    });

    it('should return ok for Redis when disabled', async () => {
      const result = await service.getReady();
      expect(result.checks?.redis?.status).toBe('ok');
      expect(result.checks?.redis?.message).toBe('disabled (in-memory)');
    });
  });

  describe('getLive', () => {
    it('should return ok status', () => {
      const result = service.getLive();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });
});
