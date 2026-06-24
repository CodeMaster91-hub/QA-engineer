import { Injectable } from '@nestjs/common';
import { AdapterFactory } from './adapters/adapter.factory';
import {
  TmsSchema,
  TmsProject,
  TmsNode,
  PublishParams,
  PublishResult,
} from './tms.types';

@Injectable()
export class TmsService {
  constructor(private adapterFactory: AdapterFactory) {}

  getSchema(): TmsSchema {
    const adapter = this.adapterFactory.getAdapter();
    return adapter.getSchema();
  }

  async getProjects(): Promise<TmsProject[]> {
    const adapter = this.adapterFactory.getAdapter();
    return adapter.getProjects();
  }

  async getTree(projectId: string): Promise<TmsNode[]> {
    const adapter = this.adapterFactory.getAdapter();
    return adapter.getTree(projectId);
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    const adapter = this.adapterFactory.getAdapter();
    return adapter.publish(params);
  }

  getAvailableProviders() {
    return this.adapterFactory.getAvailableProviders();
  }

  getCurrentProvider(): string {
    const adapter = this.adapterFactory.getAdapter();
    return adapter.provider;
  }
}
