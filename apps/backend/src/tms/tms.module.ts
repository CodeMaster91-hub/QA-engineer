import { Module } from '@nestjs/common';
import { TmsService } from './tms.service';
import { TmsController } from './tms.controller';
import { AdapterFactory } from './adapters/adapter.factory';

@Module({
  controllers: [TmsController],
  providers: [TmsService, AdapterFactory],
  exports: [TmsService],
})
export class TmsModule {}
