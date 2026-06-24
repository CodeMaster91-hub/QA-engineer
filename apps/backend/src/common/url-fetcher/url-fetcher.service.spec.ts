import { Test, TestingModule } from '@nestjs/testing';
import { UrlFetcherService } from './url-fetcher.service';

describe('UrlFetcherService', () => {
  let service: UrlFetcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UrlFetcherService],
    }).compile();

    service = module.get<UrlFetcherService>(UrlFetcherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUrl', () => {
    it('should reject invalid URLs', async () => {
      const result = await service.validateUrl('not-a-url');
      expect(result.ok).toBe(false);
    });

    it('should reject non-http protocols', async () => {
      const result = await service.validateUrl('ftp://example.com');
      expect(result.ok).toBe(false);
    });
  });

  describe('fetchUrl', () => {
    it('should reject invalid URLs', async () => {
      const result = await service.fetchUrl('not-a-url');
      expect(result.ok).toBe(false);
    });
  });
});
