import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guard';
import { PipelineService } from './pipeline.service';
import { PipelineStage } from './pipeline.entity';

@Controller('pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.pipelineService.findByFeatureSlug(slug);
  }

  @Post(':slug/run')
  @HttpCode(HttpStatus.OK)
  async run(@Param('slug') slug: string) {
    return this.pipelineService.run(slug);
  }

  @Post(':slug/restart')
  @HttpCode(HttpStatus.OK)
  async restart(
    @Param('slug') slug: string,
    @Body('fromStage') fromStage?: PipelineStage,
  ) {
    return this.pipelineService.restart(slug, fromStage);
  }

  @Post(':slug/continue')
  @HttpCode(HttpStatus.OK)
  async continue(@Param('slug') slug: string) {
    return this.pipelineService.continue(slug);
  }

  @Post(':slug/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('slug') slug: string) {
    return this.pipelineService.cancel(slug);
  }

  @Post(':slug/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('slug') slug: string) {
    return this.pipelineService.approveStage(slug);
  }

  @Post(':slug/answer')
  @HttpCode(HttpStatus.OK)
  async answerQuestions(@Param('slug') slug: string) {
    return this.pipelineService.answerQuestions(slug);
  }

  @Post(':slug/restart-stage')
  @HttpCode(HttpStatus.OK)
  async restartStage(
    @Param('slug') slug: string,
    @Body('stage') stage: PipelineStage,
  ) {
    return this.pipelineService.restartStage(slug, stage);
  }

  @Post(':slug/fill-gaps')
  @HttpCode(HttpStatus.OK)
  async fillGaps(
    @Param('slug') slug: string,
    @Body('gaps') gaps: string[],
  ) {
    return this.pipelineService.fillGaps(slug, gaps);
  }
}
