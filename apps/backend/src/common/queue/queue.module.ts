import { Module, Global } from '@nestjs/common';
import { QueueService } from './in-memory-queue';

@Global()
@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
