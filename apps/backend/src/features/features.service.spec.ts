import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeaturesService } from './features.service';
import { Feature, FeatureStatus } from './feature.entity';
import { FeatureArtifact, ArtifactType } from './feature-artifact.entity';
import { FileProcessorService } from '../common/file-processor/file-processor.service';
import { UrlFetcherService } from '../common/url-fetcher/url-fetcher.service';
import { LLMService } from '../agents/llm.service';

describe('FeaturesService', () => {
  let service: FeaturesService;
  let featureRepository: any;
  let artifactRepository: any;

  const mockFeature = {
    id: '1',
    slug: 'test-feature',
    title: 'Test Feature',
    status: FeatureStatus.NEW,
    artifacts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockArtifact = {
    id: '1',
    featureId: '1',
    type: ArtifactType.SOURCE,
    content: { text: 'Test content' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    featureRepository = {
      findAndCount: jest.fn().mockResolvedValue([[mockFeature], 1]),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where?.slug === 'nonexistent') return null;
        return mockFeature;
      }),
      create: jest.fn().mockReturnValue(mockFeature),
      save: jest.fn().mockResolvedValue(mockFeature),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    artifactRepository = {
      find: jest.fn().mockResolvedValue([mockArtifact]),
      findOne: jest.fn().mockResolvedValue(mockArtifact),
      create: jest.fn().mockReturnValue(mockArtifact),
      save: jest.fn().mockResolvedValue(mockArtifact),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesService,
        { provide: getRepositoryToken(Feature), useValue: featureRepository },
        { provide: getRepositoryToken(FeatureArtifact), useValue: artifactRepository },
        { provide: FileProcessorService, useValue: { processFile: jest.fn() } },
        { provide: UrlFetcherService, useValue: { fetchUrl: jest.fn() } },
        { provide: LLMService, useValue: { complete: jest.fn() } },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated features', async () => {
      const result = await service.findAll(1, 10);
      expect(result.data).toEqual([mockFeature]);
      expect(result.total).toBe(1);
    });
  });

  describe('findBySlug', () => {
    it('should return feature by slug', async () => {
      const result = await service.findBySlug('test-feature');
      expect(result).toEqual(mockFeature);
      expect(featureRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-feature' },
        relations: ['artifacts'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findBySlug('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('create', () => {
    it('should create a new feature', async () => {
      featureRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.create('new-feature', 'New Feature');
      expect(featureRepository.create).toHaveBeenCalled();
      expect(featureRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockFeature);
    });
  });

  describe('delete', () => {
    it('should delete feature by slug', async () => {
      await service.delete('test-feature');
      expect(featureRepository.delete).toHaveBeenCalledWith({ slug: 'test-feature' });
    });

    it('should throw NotFoundException if not found', async () => {
      featureRepository.delete.mockResolvedValueOnce({ affected: 0 });
      await expect(service.delete('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('upsertArtifact', () => {
    it('should create artifact if not exists', async () => {
      artifactRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.upsertArtifact('1', ArtifactType.SOURCE, { text: 'Test' });
      expect(artifactRepository.create).toHaveBeenCalled();
      expect(artifactRepository.save).toHaveBeenCalled();
    });

    it('should update artifact if exists', async () => {
      const result = await service.upsertArtifact('1', ArtifactType.SOURCE, { text: 'Updated' });
      expect(artifactRepository.save).toHaveBeenCalled();
    });
  });
});
