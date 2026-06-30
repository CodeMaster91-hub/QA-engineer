import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TmsService } from './tms.service';
import { TmsController } from './tms.controller';
import { AdapterFactory } from './adapters/adapter.factory';

@Module({
  imports: [ConfigModule],
  controllers: [TmsController],
  providers: [TmsService, AdapterFactory],
  exports: [TmsService],
})
export class TmsModule {}
