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

export class TestLinkAdapter extends TmsAdapter {
  readonly provider = 'testlink';
  readonly name = 'TestLink';

  private baseUrl: string;
  private apiKey: string;
  private isMock: boolean;

  constructor(private configService: ConfigService) {
    super();
    this.baseUrl = this.configService.get<string>('TESTLINK_URL', '');
    this.apiKey = this.configService.get<string>('TESTLINK_API_KEY', '');
    this.isMock = this.configService.get<string>('TESTLINK_MOCK', 'true') === 'true';
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
          key: 'suite_id',
          label: 'Тест-сьют',
          type: 'tree',
          required: false,
          dependsOn: 'project_id',
        },
      ],
      capabilities: {
        supportsTestSteps: true,
        supportsPreconditions: true,
        supportsTags: false,
        supportsAttachments: false,
        supportsTestPlans: true,
        supportsTestRuns: true,
        supportsCustomFields: false,
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
    return this.request<TmsProject[]>('POST', 'getProjects');
  }

  async getTree(projectId: string): Promise<TmsNode[]> {
    if (this.isMock) {
      return [
        { id: '1', name: 'Mock Suite', type: 'suite', parentId: projectId },
      ];
    }

    const suites = await this.request<any[]>(
      'POST',
      `getTestSuitesForTestPlan`,
      { testplanid: projectId },
    );

    return this.mapSuitesToNodes(suites, null);
  }

  private mapSuitesToNodes(suites: any[], parentId: string | null): TmsNode[] {
    const nodes: TmsNode[] = [];

    for (const suite of suites) {
      const node: TmsNode = {
        id: String(suite.id),
        name: suite.name,
        type: 'suite',
        parentId: parentId || undefined,
      };
      nodes.push(node);
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
        nodeUrl: `${this.baseUrl}/index.php?/projects/view/${projectId}`,
      };
    }

    const errors: string[] = [];
    let publishedCount = 0;

    for (const testCase of testCases) {
      try {
        await this.createTestCase(projectId, nodeId, testCase);
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

  private async createTestCase(
    projectId: string,
    suiteId: string,
    testCase: TmsTestCase,
  ): Promise<any> {
    const caseData: any = {
      testcaseprojectid: projectId,
      testsuiteid: suiteId,
      testcasename: testCase.title,
      summary: testCase.description || '',
      preconditions: testCase.preconditions || '',
      authorlogin: 'admin',
    };

    if (testCase.steps && testCase.steps.length > 0) {
      caseData.steps = testCase.steps.map((step, index) => ({
        step_number: index + 1,
        actions: step.action,
        expected_results: step.expected,
        execution_type: 1,
      }));
    }

    if (testCase.priority) {
      const priorityMap: Record<string, number> = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };
      caseData.importance = priorityMap[testCase.priority.toLowerCase()] || 2;
    }

    return this.request<any>('POST', 'createTestCaseManual', caseData);
  }

  protected async request<T>(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}/lib/api/xmlrpc/v1/xmlrpc.php`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
        },
        body: this.buildXmlRpcRequest(endpoint, {
          ...body,
          devKey: this.apiKey,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TestLink API error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    return this.parseXmlRpcResponse(text) as T;
  }

  private buildXmlRpcRequest(method: string, params: any): string {
    const paramsXml = Object.entries(params)
      .map(
        ([key, value]) =>
          `<member><name>${key}</name><value><string>${value}</string></value></member>`,
      )
      .join('');

    return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    <param>
      <value>
        <struct>${paramsXml}</struct>
      </value>
    </param>
  </params>
</methodCall>`;
  }

  private parseXmlRpcResponse(xml: string): any {
    const match = xml.match(/<value>.*?<\/value>/s);
    if (match) {
      return { status: 'ok' };
    }
    return { status: 'error' };
  }
}
