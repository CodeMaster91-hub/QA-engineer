import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileProcessorService } from './file-processor.service';

describe('FileProcessorService', () => {
  let service: FileProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileProcessorService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(10 * 1024 * 1024) } },
      ],
    }).compile();

    service = module.get<FileProcessorService>(FileProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFile', () => {
    it('should process text file', async () => {
      const buffer = Buffer.from('Hello, World!');
      const result = await service.processFile(buffer, 'test.txt');
      expect(result.text).toBe('Hello, World!');
      expect(result.metadata.type).toBe('text');
    });

    it('should process markdown file', async () => {
      const buffer = Buffer.from('# Title\n\nContent');
      const result = await service.processFile(buffer, 'test.md');
      expect(result.text).toBe('# Title\n\nContent');
      expect(result.metadata.type).toBe('markdown');
    });

    it('should process csv file', async () => {
      const buffer = Buffer.from('name,value\ntest,123');
      const result = await service.processFile(buffer, 'test.csv');
      expect(result.text).toContain('name');
      expect(result.text).toContain('value');
      expect(result.metadata.type).toBe('csv');
    });

    it('should reject files exceeding size limit', async () => {
      const buffer = Buffer.alloc(11 * 1024 * 1024);
      await expect(service.processFile(buffer, 'large.txt')).rejects.toThrow('File size exceeds limit');
    });

    it('should reject unsupported file types', async () => {
      const buffer = Buffer.from('test');
      await expect(service.processFile(buffer, 'test.exe')).rejects.toThrow('Unsupported file type');
    });
  });
});
