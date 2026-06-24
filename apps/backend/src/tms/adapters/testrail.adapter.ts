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

export class TestRailAdapter extends TmsAdapter {
  readonly provider = 'testrail';
  readonly name = 'TestRail';

  private baseUrl: string;
  private apiKey: string;
  private isMock: boolean;

  constructor(private configService: ConfigService) {
    super();
    this.baseUrl = this.configService.get<string>('TESTRAIL_URL', '');
    this.apiKey = this.configService.get<string>('TESTRAIL_API_KEY', '');
    this.isMock = this.configService.get<string>('TESTRAIL_MOCK', 'true') === 'true';
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
          key: 'suite_id',
          label: 'Suite',
          type: 'select',
          required: true,
          dependsOn: 'project_id',
        },
        {
          key: 'section_id',
          label: 'Секция',
          type: 'select',
          required: false,
          dependsOn: 'suite_id',
          allowCreate: true,
        },
      ],
      capabilities: {
        supportsTestSteps: true,
        supportsPreconditions: true,
        supportsTags: false,
        supportsAttachments: false,
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
    return this.request<TmsProject[]>('GET', 'get_projects');
  }

  async getTree(projectId: string): Promise<TmsNode[]> {
    if (this.isMock) {
      return [
        { id: '1', name: 'Mock Suite', type: 'suite', parentId: projectId },
      ];
    }

    const suites = await this.request<any[]>(
      'GET',
      `get_suites/${projectId}`,
    );

    const nodes: TmsNode[] = [];

    for (const suite of suites) {
      nodes.push({
        id: String(suite.id),
        name: suite.name,
        type: 'suite',
        parentId: projectId,
      });

      const sections = await this.request<any[]>(
        'GET',
        `get_sections/${projectId}&suite_id=${suite.id}`,
      );

      for (const section of sections) {
        nodes.push({
          id: String(section.id),
          name: section.name,
          type: 'section',
          parentId: String(suite.id),
        });
      }
    }

    return nodes;
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    const { projectId, nodeId, testCases } = params;

    if (this.isMock) {
      return {
        success: true,
        publishedCount: testCases.length,
        nodeUrl: `${this.baseUrl}/index.php?/projects/view/${projectId}`,
      };
    }

    let sectionId = nodeId;

    const errors: string[] = [];
    let publishedCount = 0;

    for (const testCase of testCases) {
      try {
        await this.createCase(sectionId, testCase);
        publishedCount++;
      } catch (error) {
        errors.push(`Failed to publish case "${testCase.title}": ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      publishedCount,
      nodeUrl: `${this.baseUrl}/index.php?/projects/view/${projectId}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async createCase(sectionId: string, testCase: TmsTestCase): Promise<any> {
    const caseData: any = {
      title: testCase.title,
      custom_automation_type: 0,
    };

    if (testCase.description) {
      caseData.custom_preconds = testCase.description;
    }

    if (testCase.preconditions) {
      caseData.custom_preconds = testCase.preconditions;
    }

    if (testCase.steps && testCase.steps.length > 0) {
      caseData.custom_steps_separated = testCase.steps.map((step) => ({
        step: step.action,
        expected: step.expected,
        data: step.data || '',
      }));
    } else if (testCase.expectedResult) {
      caseData.custom_expected = testCase.expectedResult;
    }

    if (testCase.priority) {
      const priorityMap: Record<string, number> = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };
      caseData.priority_id = priorityMap[testCase.priority.toLowerCase()] || 2;
    }

    if (testCase.type) {
      const typeMap: Record<string, number> = {
        functional: 1,
        regression: 2,
        smoke: 3,
        security: 4,
        performance: 5,
      };
      caseData.type_id = typeMap[testCase.type.toLowerCase()] || 1;
    }

    return this.request<any>('POST', `add_case/${sectionId}`, caseData);
  }

  protected async request<T>(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const auth = Buffer.from(`api:${this.apiKey}`).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/index.php?/api/v2/${endpoint}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TestRail API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }
}
