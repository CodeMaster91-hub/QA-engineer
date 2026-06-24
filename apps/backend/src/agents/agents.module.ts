import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentConfig } from './agent-config.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { LLMService } from './llm.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentConfig])],
  controllers: [AgentsController],
  providers: [AgentsService, LLMService],
  exports: [AgentsService, LLMService],
})
export class AgentsModule {}
