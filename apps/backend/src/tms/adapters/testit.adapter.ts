import { ConfigService } from '@nestjs/config';
import {
  TmsAdapter,
  TmsSchema,
  TmsProject,
  TmsNode,
  PublishParams,
  PublishResult,
  TmsTestCase,
} from '../tms.types';

export class TestITAdapter extends TmsAdapter {
  readonly provider = 'testit';
  readonly name = 'Test IT';

  private baseUrl: string;
  private apiToken: string;
  private isMock: boolean;

  constructor(private configService: ConfigService) {
    super();
    this.baseUrl = this.configService.get<string>('TESTIT_URL', '');
    this.apiToken = this.configService.get<string>('TESTIT_API_TOKEN', '');
    this.isMock = this.configService.get<string>('TESTIT_MOCK', 'true') === 'true';
  }

  getSchema(): TmsSchema {
    return {
      provider: this.provider,
      name: this.name,
      fields: [
        {
          key: 'project_id',
          label: 'Проект',
          type: 'select',
          required: true,
        },
        {
          key: 'test_plan_id',
          label: 'Тест-план',
          type: 'select',
          required: true,
          dependsOn: 'project_id',
        },
        {
          key: 'test_suite_id',
          label: 'Тест-сьют',
          type: 'select',
          required: false,
          dependsOn: 'test_plan_id',
          allowCreate: true,
        },
      ],
      capabilities: {
        supportsTestSteps: true,
        supportsPreconditions: true,
        supportsTags: true,
        supportsAttachments: true,
        supportsTestPlans: true,
        supportsTestRuns: true,
        supportsCustomFields: true,
      },
    };
  }

  async getProjects(): Promise<TmsProject[]> {
    if (this.isMock) {
      return [
        { id: '1', name: 'Mock Project 1' },
        { id: '2', name: 'Mock Project 2' },
      ];
    }
    return this.request<TmsProject[]>('GET', 'projects');
  }

  async getTree(projectId: string): Promise<TmsNode[]> {
    if (this.isMock) {
      return [
        { id: '1', name: 'Mock Test Plan', type: 'plan', parentId: projectId },
      ];
    }

    const testPlans = await this.request<any[]>(
      'GET',
      `projects/${projectId}/test-plans`,
    );

    const nodes: TmsNode[] = [];

    for (const plan of testPlans) {
      nodes.push({
        id: String(plan.id),
        name: plan.name,
        type: 'plan',
        parentId: projectId,
      });

      const suites = await this.request<any[]>(
        'GET',
        `test-plans/${plan.id}/test-suites`,
      );

      for (const suite of suites) {
        nodes.push({
          id: String(suite.id),
          name: suite.name,
          type: 'suite',
          parentId: String(plan.id),
        });
      }
    }

    return nodes;
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    const { projectId, nodeId, testCases, metadata } = params;
    const testPlanId = metadata?.testPlanId;

    if (this.isMock) {
      return {
        success: true,
        publishedCount: testCases.length,
        nodeUrl: `${this.baseUrl}/projects/${projectId}/test-plans/${testPlanId}`,
      };
    }

    const errors: string[] = [];
    let publishedCount = 0;

    for (const testCase of testCases) {
      try {
        await this.createWorkItem(projectId, testCase);
        publishedCount++;
      } catch (error) {
        errors.push(`Failed to publish case "${testCase.title}": ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      publishedCount,
      nodeUrl: `${this.baseUrl}/projects/${projectId}/test-plans/${testPlanId}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async createWorkItem(
    projectId: string,
    testCase: TmsTestCase,
  ): Promise<any> {
    const workItemData: any = {
      name: testCase.title,
    };

    if (testCase.description) {
      workItemData.description = testCase.description;
    }

    if (testCase.preconditions) {
      workItemData.precondition = testCase.preconditions;
    }

    if (testCase.steps && testCase.steps.length > 0) {
      workItemData.steps = testCase.steps.map((step, index) => ({
        order: index + 1,
        action: step.action,
        expectedResult: step.expected,
        testData: step.data || '',
      }));
    }

    if (testCase.priority) {
      const priorityMap: Record<string, string> = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical',
      };
      workItemData.attributes = {
        priority: priorityMap[testCase.priority.toLowerCase()] || 'Medium',
      };
    }

    if (testCase.tags && testCase.tags.length > 0) {
      workItemData.tags = testCase.tags;
    }

    return this.request<any>('POST', `projects/${projectId}/work-items`, workItemData);
  }

  protected async request<T>(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}/api/v3/${endpoint}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${this.apiToken}`,
          'private-token': this.apiToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Test IT API error: ${response.status} - ${error}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }
}
