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

      const dryRunArtifact = feature.artifacts?.find(
        (a) => a.type === ArtifactType.DRY_RUN,
      );

      const testcasesArtifact = feature.artifacts?.find(
        (a) => a.type === ArtifactType.TESTCASES,
      );

      if (!testcasesArtifact) {
        throw new Error(`Test cases not found for feature: ${featureSlug}`);
      }

      const allCases = testcasesArtifact.content?.cases || [];

      const dryRunData = dryRunArtifact?.content;
      const approvedCases = dryRunData?.cases?.filter(
        (c: any) => c.status === 'approved',
      ) || allCases;

      const sectionMap: Record<string, number> = {};

      if (sectionId) {
        sectionMap['__default__'] = sectionId;
      }

      const newSections = dryRunData?.sections?.new || [];
      for (const newSection of newSections) {
        const created = await this.testrailService.createSection(
          projectId,
          suiteId,
          newSection.name,
          `Auto-generated section for feature: ${featureSlug}`,
        );
        sectionMap[newSection.name] = created.id;
      }

      let publishedCount = 0;
      const errors: string[] = [];

      for (const testCase of approvedCases) {
        try {
          let targetSectionId: number;

          if (testCase.targetSectionId) {
            targetSectionId = parseInt(testCase.targetSectionId, 10);
          } else if (testCase.targetSectionName && sectionMap[testCase.targetSectionName]) {
            targetSectionId = sectionMap[testCase.targetSectionName];
          } else if (sectionMap['__default__']) {
            targetSectionId = sectionMap['__default__'];
          } else {
            const defaultSection = await this.testrailService.createSection(
              projectId,
              suiteId,
              feature.title,
              `Auto-generated section for feature: ${featureSlug}`,
            );
            targetSectionId = defaultSection.id;
            sectionMap['__default__'] = targetSectionId;
          }

          const priorityMap: Record<string, number> = {
            low: 1,
            medium: 2,
            high: 3,
            critical: 4,
          };

          await this.testrailService.createCase(targetSectionId, {
            title: testCase.title,
            type_id: 1,
            priority_id: priorityMap[testCase.priority?.toLowerCase()] || 2,
            estimate: '5m',
          });

          publishedCount++;
        } catch (error) {
          errors.push(`Failed to publish case "${testCase.title}": ${error.message}`);
        }
      }

      if (dryRunArtifact && dryRunData) {
        const updatedCases = dryRunData.cases.map((c: any) => ({
          ...c,
          published: c.status === 'approved',
        }));
        dryRunArtifact.content = {
          ...dryRunData,
          cases: updatedCases,
        };
        await this.featuresService.upsertArtifact(
          feature.id,
          ArtifactType.DRY_RUN,
          dryRunArtifact.content,
        );
      }

      this.logger.log(
        `Published ${publishedCount} test cases for feature: ${featureSlug}`,
      );

      return {
        featureSlug,
        casesPublished: publishedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error(`TestRail publish failed: ${error.message}`);
      throw error;
    }
  }
}
