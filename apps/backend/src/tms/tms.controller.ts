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
import { Roles } from '../auth/roles.decorator';
import { TmsService } from './tms.service';
import { PublishParams } from './tms.types';

@Controller('tms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TmsController {
  constructor(private tmsService: TmsService) {}

  @Get('schema')
  async getSchema() {
    return this.tmsService.getSchema();
  }

  @Get('providers')
  async getProviders() {
    return {
      current: this.tmsService.getCurrentProvider(),
      available: this.tmsService.getAvailableProviders(),
    };
  }

  @Get('projects')
  async getProjects() {
    return this.tmsService.getProjects();
  }

  @Get('tree/:projectId')
  async getTree(@Param('projectId') projectId: string) {
    return this.tmsService.getTree(projectId);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async publish(@Body() params: PublishParams) {
    return this.tmsService.publish(params);
  }
}
