import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AgentsService } from './agents.service';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { PipelineStage } from '../pipeline/pipeline.entity';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get('config')
  async getConfig() {
    return this.agentsService.findAll();
  }

  @Patch('config/:stage')
  @Roles('admin')
  async updateConfig(
    @Param('stage') stage: PipelineStage,
    @Body() updateDto: UpdateAgentConfigDto,
  ) {
    return this.agentsService.update(stage, updateDto);
  }

  @Get('providers')
  async getProviders() {
    return this.agentsService.getProviders();
  }
}
