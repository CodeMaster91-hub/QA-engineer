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

export class ZephyrAdapter extends TmsAdapter {
  readonly provider = 'zephyr';
  readonly name = 'Zephyr Scale';

  private baseUrl: string;
  private apiToken: string;
  private isMock: boolean;

  constructor(private configService: ConfigService) {
    super();
    this.baseUrl = this.configService.get<string>('ZEPHYR_URL', '');
    this.apiToken = this.configService.get<string>('ZEPHYR_API_TOKEN', '');
    this.isMock = this.configService.get<string>('ZEPHYR_MOCK', 'true') === 'true';
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
          key: 'folder_id',
          label: 'Папка',
          type: 'tree',
          required: true,
          dependsOn: 'project_id',
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
    return this.request<TmsProject[]>('GET', 'project');
  }

  async getTree(projectId: string): Promise<TmsNode[]> {
    if (this.isMock) {
      return [
        { id: '1', name: 'Mock Folder', type: 'folder', parentId: projectId },
      ];
    }

    const folders = await this.request<any[]>(
      'GET',
      `folder/tree?projectId=${projectId}`,
    );

    return this.mapFoldersToNodes(folders, null);
  }

  private mapFoldersToNodes(folders: any[], parentId: string | null): TmsNode[] {
    const nodes: TmsNode[] = [];

    for (const folder of folders) {
      const node: TmsNode = {
        id: String(folder.id),
        name: folder.name,
        type: 'folder',
        parentId: parentId || undefined,
        children: folder.children
          ? this.mapFoldersToNodes(folder.children, String(folder.id))
          : undefined,
      };
      nodes.push(node);
    }

    return nodes;
  }

  async publish(params: PublishParams): Promise<PublishResult> {
    const { projectId, nodeId, testCases } = params;

    if (this.isMock) {
      return {
        success: true,
        publishedCount: testCases.length,
        nodeUrl: `${this.baseUrl}/projects/${projectId}/folders/${nodeId}`,
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
      nodeUrl: `${this.baseUrl}/projects/${projectId}/folders/${nodeId}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async createTestCase(
    projectId: string,
    folderId: string,
    testCase: TmsTestCase,
  ): Promise<any> {
    const caseData: any = {
      projectKey: projectId,
      name: testCase.title,
      folderId: folderId,
    };

    if (testCase.description) {
      caseData.objective = testCase.description;
    }

    if (testCase.preconditions) {
      caseData.precondition = testCase.preconditions;
    }

    if (testCase.steps && testCase.steps.length > 0) {
      caseData.steps = testCase.steps.map((step, index) => ({
        order: index + 1,
        description: step.action,
        expectedResult: step.expected,
        testData: step.data || '',
      }));
    }

    if (testCase.priority) {
      const priorityMap: Record<string, string> = {
        low: '1',
        medium: '2',
        high: '3',
        critical: '4',
      };
      caseData.priority = priorityMap[testCase.priority.toLowerCase()] || '2';
    }

    if (testCase.tags && testCase.tags.length > 0) {
      caseData.labels = testCase.tags.join(',');
    }

    return this.request<any>('POST', 'testcase', caseData);
  }

  protected async request<T>(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}/rest/api/latest/${endpoint}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zephyr API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }
}
