import { Injectable, Logger } from '@nestjs/common';
import { TestRailService } from './testrail.service';
import { FeaturesService } from '../features/features.service';
import { ArtifactType } from '../features/feature-artifact.entity';
import { QueueService, InMemoryQueue } from '../common/queue/in-memory-queue';

export interface TestRailPublishJob {
  featureSlug: string;
  projectId: number;
  suiteId: number;
  sectionId?: number;
}

@Injectable()
export class TestRailProcessor {
  private readonly logger = new Logger(TestRailProcessor.name);
  private queue: InMemoryQueue;

  constructor(
    private testrailService: TestRailService,
    private featuresService: FeaturesService,
    private queueService: QueueService,
  ) {
    this.queue = this.queueService.getQueue('testrail-sync');
    this.queue.process({
      process: (job) => this.processJob(job),
    });
  }

  async addJob(data: TestRailPublishJob, options?: { jobId?: string }) {
    return this.queue.add(data);
  }

  private async processJob(job: any): Promise<any> {
    const { featureSlug, projectId, suiteId, sectionId } = job.data;

    this.logger.log(
      `Processing TestRail publish job ${job.id} for feature: ${featureSlug}`,
    );

    try {
      const feature = await this.featuresService.findBySlug(featureSlug);

      const testcasesArtifact = feature.artifacts?.find(
        (a) => a.type === ArtifactType.TESTCASES,
      );

      if (!testcasesArtifact) {
        throw new Error(`Test cases not found for feature: ${featureSlug}`);
      }

      const testcases = testcasesArtifact.content?.testcases || [];

      let targetSectionId = sectionId;
      if (!targetSectionId) {
        const section = await this.testrailService.createSection(
          projectId,
          suiteId,
          feature.title,
          `Auto-generated section for feature: ${featureSlug}`,
        );
        targetSectionId = section.id;
      }

      const totalCases = testcases.length;
      for (let i = 0; i < totalCases; i++) {
        const testcase = testcases[i];

        await this.testrailService.createCase(targetSectionId, {
          title: testcase.title || `Test Case ${i + 1}`,
          type_id: testcase.type_id || 1,
          priority_id: testcase.priority_id || 2,
          estimate: testcase.estimate || '5m',
          refs: testcase.refs,
        });
      }

      this.logger.log(
        `Published ${totalCases} test cases for feature: ${featureSlug}`,
      );

      return {
        featureSlug,
        sectionId: targetSectionId,
        casesPublished: totalCases,
      };
    } catch (error) {
      this.logger.error(`TestRail publish failed: ${error.message}`);
      throw error;
    }
  }
}
