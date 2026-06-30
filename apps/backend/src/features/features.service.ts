import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Feature, FeatureStatus } from './feature.entity';
import { FeatureArtifact, ArtifactType } from './feature-artifact.entity';
import { FileProcessorService, ProcessedFile } from '../common/file-processor/file-processor.service';
import { UrlFetcherService } from '../common/url-fetcher/url-fetcher.service';

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);

  constructor(
    @InjectRepository(Feature)
    private featuresRepository: Repository<Feature>,
    @InjectRepository(FeatureArtifact)
    private artifactsRepository: Repository<FeatureArtifact>,
    private fileProcessor: FileProcessorService,
    private urlFetcher: UrlFetcherService,
  ) {}

  async findAll(page = 1, limit = 20): Promise<{ data: (Feature & { reqCount: number; caseCount: number })[]; total: number }> {
    const [data, total] = await this.featuresRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    const result = await Promise.all(
      data.map(async (feature) => {
        const counts = await this.getArtifactCounts(feature.id);
        return { ...feature, reqCount: counts.reqCount, caseCount: counts.caseCount };
      }),
    );
    return { data: result, total };
  }

  async findById(id: string): Promise<Feature> {
    const feature = await this.featuresRepository.findOne({ where: { id } });
    if (!feature) throw new NotFoundException(`Feature with id ${id} not found`);
    return feature;
  }

  async findBySlug(slug: string): Promise<Feature & { reqCount: number; caseCount: number }> {
    const feature = await this.featuresRepository.findOne({
      where: { slug },
      relations: ['artifacts'],
    });
    if (!feature) {
      throw new NotFoundException(`Feature with slug "${slug}" not found`);
    }
    const counts = await this.getArtifactCounts(feature.id);
    return { ...feature, reqCount: counts.reqCount, caseCount: counts.caseCount };
  }

  async create(slug: string, title: string): Promise<Feature> {
    const existing = await this.featuresRepository.findOne({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Feature with slug "${slug}" already exists`);
    }
    const feature = this.featuresRepository.create({
      slug,
      title,
      status: FeatureStatus.NEW,
    });
    return this.featuresRepository.save(feature);
  }

  async createWithSource(
    sourceType: 'text' | 'file' | 'url',
    sourceText?: string,
    file?: Express.Multer.File,
    sourceUrl?: string,
  ): Promise<{ feature: Feature; preview: string }> {
    let processedContent: ProcessedFile;
    let fileName = '';

    try {
      switch (sourceType) {
        case 'text':
          if (!sourceText) {
            throw new BadRequestException('sourceText is required for text type');
          }
          processedContent = {
            text: sourceText,
            images: [],
            metadata: { type: 'text' },
          };
          break;

        case 'file':
          if (!file) {
            throw new BadRequestException('File is required for file type');
          }
          this.logger.log(`Processing file: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`);
          processedContent = await this.fileProcessor.processFile(
            file.buffer,
            file.originalname,
          );
          fileName = decodeURIComponent(
            Buffer.from(file.originalname, 'latin1').toString('utf8'),
          );
          break;

        case 'url':
          if (!sourceUrl) {
            throw new BadRequestException('sourceUrl is required for url type');
          }
          const urlResult = await this.urlFetcher.fetchUrl(sourceUrl);
          if (!urlResult.ok) {
            throw new BadRequestException(`Failed to fetch URL: ${urlResult.error}`);
          }
          processedContent = {
            text: urlResult.text || '',
            images: urlResult.images || [],
            metadata: urlResult.metadata || {},
          };
          break;

        default:
          throw new BadRequestException(`Invalid sourceType: ${sourceType}`);
      }
    } catch (error) {
      this.logger.error(`Source processing failed: ${error.message}`);
      throw error;
    }

    const preview = processedContent.text.substring(0, 500);

    const { title, slug: baseSlug } = this.generateTitleAndSlug(preview);
    const slug = await this.generateUniqueSlug(baseSlug);

    const feature = await this.create(slug, title);
    feature.sourceType = sourceType;
    feature.sourceFileName = fileName || undefined as any;
    await this.featuresRepository.save(feature);

    await this.upsertArtifact(feature.id, ArtifactType.SOURCE, {
      text: processedContent.text,
      images: processedContent.images.map((img) => ({
        data: img.data,
        mimeType: img.mimeType,
        name: img.name,
      })),
      metadata: processedContent.metadata,
    });

    this.logger.log(`Feature created with source: ${feature.slug}`);
    return { feature, preview };
  }

  private generateTitleAndSlug(text: string): { title: string; slug: string } {
    const title = this.generateFallbackTitle(text);
    const slug = this.generateFallbackSlug(title);
    return { title, slug };
  }

  private generateFallbackTitle(text: string): string {
    const lines = text.split('\n').map(l => l.replace(/^[#*>\-]+\s*/, '').trim()).filter(Boolean);
    const meaningfulLine = lines.find(l => l.length > 3 && !/^\d+$/.test(l));
    if (meaningfulLine) {
      return meaningfulLine.replace(/[^\w\sа-яА-ЯёЁ]/g, '').trim().substring(0, 60);
    }
    const cleaned = text.replace(/[^\w\sа-яА-ЯёЁ]/g, '').trim();
    return cleaned.split(/\s+/).slice(0, 8).join(' ').substring(0, 60) || 'Untitled Feature';
  }

  private generateFallbackSlug(title: string): string {
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };

    const transliterate = (str: string): string => {
      return str.split('').map(char => {
        const lower = char.toLowerCase();
        const result = translitMap[lower] ?? char;
        return char === lower ? result : result.charAt(0).toUpperCase() + result.slice(1);
      }).join('');
    };

    const base = transliterate(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    return base || 'feature';
  }

  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 2;

    while (await this.featuresRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async updateStatus(slug: string, status: FeatureStatus): Promise<Feature> {
    const feature = await this.findBySlug(slug);
    feature.status = status;
    return this.featuresRepository.save(feature);
  }

  async delete(slug: string): Promise<void> {
    const result = await this.featuresRepository.delete({ slug });
    if (result.affected === 0) {
      throw new NotFoundException(`Feature with slug "${slug}" not found`);
    }
  }

  async getArtifact(
    featureId: string,
    type: ArtifactType,
  ): Promise<FeatureArtifact | null> {
    return this.artifactsRepository.findOne({
      where: { featureId, type },
    });
  }

  async getArtifacts(featureId: string): Promise<FeatureArtifact[]> {
    return this.artifactsRepository.find({
      where: { featureId },
    });
  }

  async getArtifactCounts(featureId: string): Promise<{ reqCount: number; caseCount: number }> {
    const artifacts = await this.artifactsRepository.find({
      where: { featureId, type: In([ArtifactType.REQUIREMENTS, ArtifactType.TESTCASES]) },
    });
    let reqCount = 0;
    let caseCount = 0;
    for (const artifact of artifacts) {
      if (artifact.type === ArtifactType.REQUIREMENTS) {
        const content = artifact.content as { requirements?: any[] };
        reqCount = content?.requirements?.length || 0;
      } else if (artifact.type === ArtifactType.TESTCASES) {
        const content = artifact.content as { cases?: any[] };
        caseCount = content?.cases?.length || 0;
      }
    }
    return { reqCount, caseCount };
  }

  async upsertArtifact(
    featureId: string,
    type: ArtifactType,
    content: Record<string, any>,
  ): Promise<FeatureArtifact> {
    let artifact = await this.getArtifact(featureId, type);
    if (artifact) {
      artifact.content = content;
    } else {
      artifact = this.artifactsRepository.create({
        featureId,
        type,
        content,
      });
    }
    return this.artifactsRepository.save(artifact);
  }
}
