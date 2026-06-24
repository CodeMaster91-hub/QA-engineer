export interface TmsProject {
  id: string;
  name: string;
  key?: string;
  description?: string;
}

export interface TmsNode {
  id: string;
  name: string;
  type: 'project' | 'suite' | 'folder' | 'section' | 'module' | 'plan' | 'cycle';
  parentId?: string;
  children?: TmsNode[];
  metadata?: Record<string, any>;
}

export interface TmsTestCase {
  id?: string;
  title: string;
  description?: string;
  preconditions?: string;
  steps?: TmsTestStep[];
  expectedResult?: string;
  priority?: string;
  type?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface TmsTestStep {
  order: number;
  action: string;
  expected: string;
  data?: string;
}

export interface PublishParams {
  projectId: string;
  nodeId: string;
  testCases: TmsTestCase[];
  metadata?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  publishedCount: number;
  nodeUrl?: string;
  errors?: string[];
}

export interface TmsField {
  key: string;
  label: string;
  type: 'select' | 'tree' | 'input' | 'multiselect';
  required: boolean;
  dependsOn?: string;
  allowCreate?: boolean;
  apiEndpoint?: string;
  options?: TmsFieldOption[];
}

export interface TmsFieldOption {
  value: string;
  label: string;
  children?: TmsFieldOption[];
}

export interface TmsSchema {
  provider: string;
  name: string;
  version?: string;
  fields: TmsField[];
  capabilities: TmsCapabilities;
}

export interface TmsCapabilities {
  supportsTestSteps: boolean;
  supportsPreconditions: boolean;
  supportsTags: boolean;
  supportsAttachments: boolean;
  supportsTestPlans: boolean;
  supportsTestRuns: boolean;
  supportsCustomFields: boolean;
}

export abstract class TmsAdapter {
  abstract readonly provider: string;
  abstract readonly name: string;

  abstract getSchema(): TmsSchema;
  abstract getProjects(): Promise<TmsProject[]>;
  abstract getTree(projectId: string): Promise<TmsNode[]>;
  abstract publish(params: PublishParams): Promise<PublishResult>;

  protected abstract request<T>(method: string, endpoint: string, body?: any): Promise<T>;
}
