import { Module } from '@nestjs/common';
import { UrlFetcherService } from './url-fetcher.service';

@Module({
  providers: [UrlFetcherService],
  exports: [UrlFetcherService],
})
export class UrlFetcherModule {}
