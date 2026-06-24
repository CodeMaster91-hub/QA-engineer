import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TestRailCase {
  id?: number;
  title: string;
  template_id?: number;
  type_id?: number;
  priority_id?: number;
  estimate?: string;
  refs?: string;
  custom_automation_type?: number;
}

export interface TestRailResult {
  case_id: number;
  status_id: number;
  comment?: string;
  version?: string;
  elapsed?: string;
  defects?: string;
}

export interface TestRailRun {
  id: number;
  name: string;
  description?: string;
  suite_id: number;
  created_on: number;
  updated_on: number;
  passed_count: number;
  blocked_count: number;
  untested_count: number;
  retest_count: number;
  failed_count: number;
}

@Injectable()
export class TestRailService {
  private readonly logger = new Logger(TestRailService.name);

  constructor(private configService: ConfigService) {}

  private getBaseUrl(): string {
    return this.configService.get<string>('TESTRAIL_URL', '');
  }

  private getApiKey(): string {
    return this.configService.get<string>('TESTRAIL_API_KEY', '');
  }

  private isMock(): boolean {
    return this.configService.get<string>('TESTRAIL_MOCK', 'true') === 'true';
  }

  getDefaultProjectId(): number | null {
    const id = this.configService.get<string>('TESTRAIL_PROJECT_ID');
    return id ? parseInt(id, 10) : null;
  }

  getDefaultSuiteId(): number | null {
    const id = this.configService.get<string>('TESTRAIL_SUITE_ID');
    return id ? parseInt(id, 10) : null;
  }

  getDefaultSectionId(): number | null {
    const id = this.configService.get<string>('TESTRAIL_SECTION_ID');
    return id ? parseInt(id, 10) : null;
  }

  getDefaultDestination() {
    return {
      projectId: this.getDefaultProjectId(),
      suiteId: this.getDefaultSuiteId(),
      sectionId: this.getDefaultSectionId(),
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<T> {
    if (this.isMock()) {
      return this.mockResponse<T>(endpoint);
    }

    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    const auth = Buffer.from(`api:${apiKey}`).toString('base64');

    const response = await fetch(`${baseUrl}/index.php?/api/v2/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`TestRail API error: ${response.status} - ${error}`);
      throw new Error(`TestRail API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async getProjects(): Promise<any[]> {
    return this.request<any[]>('GET', 'get_projects');
  }

  async getSuites(projectId: number): Promise<any[]> {
    return this.request<any[]>('GET', `get_suites/${projectId}`);
  }

  async getSections(
    projectId: number,
    suiteId: number,
  ): Promise<any[]> {
    return this.request<any[]>(
      'GET',
      `get_sections/${projectId}&suite_id=${suiteId}`,
    );
  }

  async createSection(
    projectId: number,
    suiteId: number,
    name: string,
    description?: string,
  ): Promise<any> {
    return this.request<any>('POST', `add_section/${projectId}`, {
      suite_id: suiteId,
      name,
      description,
    });
  }

  async getCases(
    projectId: number,
    suiteId: number,
    sectionId?: number,
  ): Promise<TestRailCase[]> {
    const params = sectionId
      ? `&section_id=${sectionId}`
      : '';
    return this.request<TestRailCase[]>(
      'GET',
      `get_cases/${projectId}&suite_id=${suiteId}${params}`,
    );
  }

  async createCase(
    sectionId: number,
    caseData: TestRailCase,
  ): Promise<TestRailCase> {
    return this.request<TestRailCase>('POST', `add_case/${sectionId}`, caseData);
  }

  async updateCase(
    caseId: number,
    caseData: Partial<TestRailCase>,
  ): Promise<TestRailCase> {
    return this.request<TestRailCase>(
      'POST',
      `update_case/${caseId}`,
      caseData,
    );
  }

  async deleteCase(caseId: number): Promise<void> {
    await this.request<void>('POST', `delete_case/${caseId}`);
  }

  async createRun(
    projectId: number,
    name: string,
    suiteIds: number[],
    description?: string,
  ): Promise<TestRailRun> {
    return this.request<TestRailRun>('POST', `add_run/${projectId}`, {
      name,
      suite_ids: suiteIds,
      description,
      include_all: true,
    });
  }

  async getRun(runId: number): Promise<TestRailRun> {
    return this.request<TestRailRun>('GET', `get_run/${runId}`);
  }

  async closeRun(runId: number): Promise<void> {
    await this.request<void>('POST', `close_run/${runId}`);
  }

  async addResultsForCases(
    runId: number,
    results: TestRailResult[],
  ): Promise<void> {
    await this.request<void>('POST', `add_results_for_cases/${runId}`, {
      results,
    });
  }

  async addResult(
    runId: number,
    caseId: number,
    statusId: number,
    comment?: string,
  ): Promise<void> {
    await this.request<void>('POST', `add_result/${runId}`, {
      case_id: caseId,
      status_id: statusId,
      comment,
    });
  }

  private mockResponse<T>(endpoint: string): any {
    this.logger.log(`[MOCK] TestRail API: ${endpoint}`);

    if (endpoint.startsWith('get_projects')) {
      return [{ id: 1, name: 'Mock Project' }];
    }
    if (endpoint.startsWith('get_suites')) {
      return [{ id: 1, name: 'Mock Suite' }];
    }
    if (endpoint.startsWith('get_sections')) {
      return [{ id: 1, name: 'Mock Section' }];
    }
    if (endpoint.startsWith('add_section')) {
      return { id: 2, name: 'New Section' };
    }
    if (endpoint.startsWith('get_cases')) {
      return [];
    }
    if (endpoint.startsWith('add_case')) {
      return { id: 1, title: 'Mock Case' };
    }
    if (endpoint.startsWith('add_run')) {
      return {
        id: 1,
        name: 'Mock Run',
        suite_id: 1,
        created_on: Date.now(),
        updated_on: Date.now(),
        passed_count: 0,
        blocked_count: 0,
        untested_count: 0,
        retest_count: 0,
        failed_count: 0,
      };
    }
    if (endpoint.startsWith('get_run')) {
      return {
        id: 1,
        name: 'Mock Run',
        passed_count: 0,
        failed_count: 0,
      };
    }
    return {};
  }
}
