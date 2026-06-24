import { Module } from '@nestjs/common';
import { TestRailService } from './testrail.service';
import { TestRailController } from './testrail.controller';
import { TestRailProcessor } from './testrail.processor';
import { FeaturesModule } from '../features/features.module';
import { QueueModule } from '../common/queue/queue.module';

@Module({
  imports: [
    QueueModule,
    FeaturesModule,
  ],
  controllers: [TestRailController],
  providers: [TestRailService, TestRailProcessor],
  exports: [TestRailService],
})
export class TestRailModule {}
