export type PipelineStatus =
  | 'idle'
  | 'running'
  | 'blocked'
  | 'waiting_for_qa'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PipelineStage =
  | 'new'
  | 'source_ingested'
  | 'requirements_extracted'
  | 'test_plan_created'
  | 'test_cases_created'
  | 'coverage_audited'
  | 'review'
  | 'dry_run_completed'
  | 'published';

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'new',
  'source_ingested',
  'requirements_extracted',
  'test_plan_created',
  'test_cases_created',
  'coverage_audited',
  'review',
  'dry_run_completed',
  'published',
];

export interface PipelineStageUI {
  key: string
  label: string
  backendStage: PipelineStage | null
  artifactType?: ArtifactType
}

export const PIPELINE_STAGES_UI: PipelineStageUI[] = [
  { key: 'source_ingested',        label: 'Source',           backendStage: 'source_ingested' },
  { key: 'requirements_extracted', label: 'Requirements',     backendStage: 'requirements_extracted' },
  { key: 'test_plan',              label: 'Test Plan',        backendStage: 'test_plan_created', artifactType: 'testplan' },
  { key: 'test_cases',             label: 'Test Cases',       backendStage: 'test_cases_created', artifactType: 'testcases' },
  { key: 'coverage_audited',       label: 'Coverage',         backendStage: 'coverage_audited' },
  { key: 'review',                 label: 'Review',           backendStage: 'review' },
  { key: 'dry_run_completed',      label: 'Dry Run',          backendStage: 'dry_run_completed' },
  { key: 'published',              label: 'Published',        backendStage: 'published' },
];

export interface PipelineQuestion {
  question: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  stage: string;
}

export interface Pipeline {
  id: string;
  featureId: string;
  status: PipelineStatus;
  currentStage: PipelineStage;
  stageResults: Record<string, { status: string; output?: any; error?: string; timestamp?: string }>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  questions: PipelineQuestion[];
  blockedStage: string | null;
  coverageGaps: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export type ArtifactType = 'source' | 'requirements' | 'testplan' | 'testcases' | 'coverage' | 'review' | 'dry_run';

export interface Artifact {
  id: string;
  featureId: string;
  type: ArtifactType;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  slug: string;
  title: string;
  status: string;
  sourceType?: string;
  sourceFileName?: string;
  artifacts?: Artifact[];
  createdAt: string;
  updatedAt: string;
}

export type StageStatus = 'created' | 'running' | 'success' | 'failed' | 'canceled';
