import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { TestRailService } from './testrail.service';
import { TestRailProcessor, TestRailPublishJob } from './testrail.processor';

@Controller('testrail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestRailController {
  constructor(
    private testrailService: TestRailService,
    private testrailProcessor: TestRailProcessor,
  ) {}

  @Get('config')
  async getConfig() {
    return {
      defaultDestination: this.testrailService.getDefaultDestination(),
    };
  }

  @Get('projects')
  async getProjects() {
    return this.testrailService.getProjects();
  }

  @Get('projects/:projectId/suites')
  async getSuites(@Param('projectId') projectId: number) {
    return this.testrailService.getSuites(projectId);
  }

  @Get('projects/:projectId/suites/:suiteId/sections')
  async getSections(
    @Param('projectId') projectId: number,
    @Param('suiteId') suiteId: number,
  ) {
    return this.testrailService.getSections(projectId, suiteId);
  }

  @Post('projects/:projectId/suites/:suiteId/sections')
  @Roles('admin')
  async createSection(
    @Param('projectId') projectId: number,
    @Param('suiteId') suiteId: number,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.testrailService.createSection(
      projectId,
      suiteId,
      name,
      description,
    );
  }

  @Post(':slug/dry-run')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async dryRun(
    @Param('slug') slug: string,
    @Body('projectId') projectId?: number,
    @Body('suiteId') suiteId?: number,
  ) {
    const finalProjectId =
      projectId || this.testrailService.getDefaultProjectId();
    const finalSuiteId =
      suiteId || this.testrailService.getDefaultSuiteId();

    if (!finalProjectId || !finalSuiteId) {
      throw new BadRequestException(
        'projectId and suiteId are required. Provide in body or set TESTRAIL_PROJECT_ID and TESTRAIL_SUITE_ID in .env',
      );
    }

    const job = await this.testrailProcessor.addJob({
      featureSlug: slug,
      projectId: finalProjectId,
      suiteId: finalSuiteId,
    } as TestRailPublishJob);

    return {
      jobId: job.id,
      message: 'Dry run started',
    };
  }

  @Post(':slug/publish')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async publish(
    @Param('slug') slug: string,
    @Body('projectId') projectId?: number,
    @Body('suiteId') suiteId?: number,
    @Body('sectionId') sectionId?: number,
  ) {
    const finalProjectId =
      projectId || this.testrailService.getDefaultProjectId();
    const finalSuiteId =
      suiteId || this.testrailService.getDefaultSuiteId();
    const finalSectionId =
      sectionId || this.testrailService.getDefaultSectionId();

    if (!finalProjectId || !finalSuiteId) {
      throw new BadRequestException(
        'projectId and suiteId are required. Provide in body or set TESTRAIL_PROJECT_ID and TESTRAIL_SUITE_ID in .env',
      );
    }

    const job = await this.testrailProcessor.addJob({
      featureSlug: slug,
      projectId: finalProjectId,
      suiteId: finalSuiteId,
      sectionId: finalSectionId,
    } as TestRailPublishJob);

    return {
      jobId: job.id,
      message: 'Publish started',
    };
  }

  @Get('jobs/:jobId/status')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.testrailProcessor['queue'].getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }

    return {
      id: job.id,
      status: job.status,
      data: job.data,
      result: job.result,
      error: job.error,
    };
  }
}
