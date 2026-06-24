import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileProcessorService } from './file-processor.service';

@Module({
  imports: [ConfigModule],
  providers: [FileProcessorService],
  exports: [FileProcessorService],
})
export class FileProcessorModule {}
