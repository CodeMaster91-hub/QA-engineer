import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pipeline } from './pipeline.entity';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { PipelineProcessor } from './pipeline.processor';
import { WorkflowEngine } from './workflow.engine';
import { FeaturesModule } from '../features/features.module';
import { AgentsModule } from '../agents/agents.module';
import { EventsModule } from '../events/events.module';
import { QueueModule } from '../common/queue/queue.module';
import { TmsModule } from '../tms/tms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pipeline]),
    QueueModule,
    FeaturesModule,
    AgentsModule,
    EventsModule,
    TmsModule,
  ],
  controllers: [PipelineController],
  providers: [PipelineService, PipelineProcessor, WorkflowEngine],
  exports: [PipelineService],
})
export class PipelineModule {}
