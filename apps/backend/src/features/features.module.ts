import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feature } from './feature.entity';
import { FeatureArtifact } from './feature-artifact.entity';
import { FeatureStage } from './feature-stage.entity';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';
import { FileProcessorModule } from '../common/file-processor/file-processor.module';
import { UrlFetcherModule } from '../common/url-fetcher/url-fetcher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feature, FeatureArtifact, FeatureStage]),
    FileProcessorModule,
    UrlFetcherModule,
  ],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
