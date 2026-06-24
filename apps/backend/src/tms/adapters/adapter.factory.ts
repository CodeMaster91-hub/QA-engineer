import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TmsAdapter } from '../tms.types';
import { TestRailAdapter } from './testrail.adapter';
import { ZephyrAdapter } from './zephyr.adapter';
import { TestITAdapter } from './testit.adapter';
import { TestLinkAdapter } from './testlink.adapter';

@Injectable()
export class AdapterFactory {
  private readonly logger = new Logger(AdapterFactory.name);
  private adapter: TmsAdapter | null = null;

  constructor(private configService: ConfigService) {}

  getAdapter(): TmsAdapter {
    if (this.adapter) {
      return this.adapter;
    }

    const provider = this.configService.get<string>('TMS_PROVIDER', 'testrail');

    switch (provider.toLowerCase()) {
      case 'testrail':
        this.adapter = new TestRailAdapter(this.configService);
        break;
      case 'zephyr':
        this.adapter = new ZephyrAdapter(this.configService);
        break;
      case 'testit':
      case 'test-it':
        this.adapter = new TestITAdapter(this.configService);
        break;
      case 'testlink':
        this.adapter = new TestLinkAdapter(this.configService);
        break;
      default:
        throw new Error(`Unknown TMS provider: ${provider}`);
    }

    this.logger.log(`Initialized TMS adapter: ${provider}`);
    return this.adapter;
  }

  getAvailableProviders(): Array<{ id: string; name: string }> {
    return [
      { id: 'testrail', name: 'TestRail' },
      { id: 'zephyr', name: 'Zephyr' },
      { id: 'testit', name: 'Test IT' },
      { id: 'testlink', name: 'TestLink' },
    ];
  }
}
