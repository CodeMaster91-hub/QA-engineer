import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { CreateFeatureWithSourceDto } from './dto/create-feature-with-source.dto';
import { CreateArtifactDto } from './dto/create-artifact.dto';
import { ArtifactType } from './feature-artifact.entity';
import { RolesGuard, JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { IsPublic } from '../auth/is-public.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Features')
@ApiBearerAuth()
@Controller('features')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeaturesController {
  private readonly maxFileSize: number;

  constructor(
    private featuresService: FeaturesService,
    private pipelineService: PipelineService,
    private configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024);
  }

  @Get()
  @ApiOperation({ summary: 'Get all features with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of features' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.featuresService.findAll(pageNum, limitNum);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created' })
  async create(@Body() createFeatureDto: CreateFeatureDto) {
    return this.featuresService.create(
      createFeatureDto.slug,
      createFeatureDto.title,
    );
  }

  @Post('create-with-source')
  @IsPublic()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Create feature with source content (text, file, or URL)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceType: { type: 'string', enum: ['text', 'file', 'url'] },
        sourceText: { type: 'string' },
        sourceUrl: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['sourceType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Feature created with source and pipeline started' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createWithSource(
    @Body() dto: CreateFeatureWithSourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (dto.sourceType === 'file' && !file) {
      throw new BadRequestException('File is required when sourceType is "file"');
    }

    if (file && file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    const result = await this.featuresService.createWithSource(
      dto.sourceType,
      dto.sourceText,
      file,
      dto.sourceUrl,
    );

    return {
      feature: result.feature,
      preview: result.preview,
    };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get feature by slug with pipeline status and artifacts' })
  @ApiResponse({ status: 200, description: 'Feature found' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async findBySlug(@Param('slug') slug: string) {
    const feature = await this.featuresService.findBySlug(slug);
    const pipeline = await this.pipelineService.findByFeatureId(feature.id);
    return { feature, pipeline };
  }

  @Delete(':slug')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete feature by slug' })
  @ApiResponse({ status: 204, description: 'Feature deleted' })
  async remove(@Param('slug') slug: string) {
    await this.featuresService.delete(slug);
  }

  @Get(':slug/artifacts/:type')
  @ApiOperation({ summary: 'Get artifact by type' })
  @ApiResponse({ status: 200, description: 'Artifact found' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async getArtifact(
    @Param('slug') slug: string,
    @Param('type') type: ArtifactType,
  ) {
    const feature = await this.featuresService.findBySlug(slug);
    return this.featuresService.getArtifact(feature.id, type);
  }

  @Post(':slug/artifacts')
  @ApiOperation({ summary: 'Create or update artifact' })
  @ApiResponse({ status: 201, description: 'Artifact created/updated' })
  async upsertArtifact(
    @Param('slug') slug: string,
    @Body() createArtifactDto: CreateArtifactDto,
  ) {
    const feature = await this.featuresService.findBySlug(slug);
    return this.featuresService.upsertArtifact(
      feature.id,
      createArtifactDto.type,
      createArtifactDto.content,
    );
  }

  @Post(':slug/source')
  @IsPublic()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Update source artifact (text or file)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceType: { type: 'string', enum: ['text', 'file'] },
        sourceText: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['sourceType'],
    },
  })
  @ApiResponse({ status: 200, description: 'Source updated' })
  async updateSource(
    @Param('slug') slug: string,
    @Body('sourceType') sourceType: 'text' | 'file',
    @Body('sourceText') sourceText?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (sourceType === 'file' && !file) {
      throw new BadRequestException('File is required when sourceType is "file"');
    }
    if (file && file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
    await this.featuresService.updateSource(slug, sourceType, sourceText, file);
    return { success: true };
  }
}
