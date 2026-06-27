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
  { key: 'requirements_extracted', label: 'Требования',       backendStage: 'requirements_extracted' },
  { key: 'test_plan',              label: 'Тест-план',        backendStage: 'test_plan_created', artifactType: 'testplan' },
  { key: 'test_cases',             label: 'Тест-кейсы',       backendStage: 'test_cases_created', artifactType: 'testcases' },
  { key: 'coverage_audited',       label: 'Покрытие',         backendStage: 'coverage_audited' },
  { key: 'review',                 label: 'Ревью',            backendStage: 'review' },
  { key: 'dry_run_completed',      label: 'Пробный запуск',   backendStage: 'dry_run_completed' },
  { key: 'published',              label: 'Опубликовано',     backendStage: 'published' },
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

export interface DryRunCase {
  id: string;
  title: string;
  section?: string;
  priority?: string;
  type?: string;
  status: 'approved' | 'draft';
  targetSectionId: string | null;
  targetSectionName: string | null;
  published: boolean;
}

export interface DryRunSection {
  id: string;
  name: string;
}

export interface DryRunNewSection {
  name: string;
  parentSectionId: string | null;
}

export interface DryRunArtifact {
  sections: {
    existing: DryRunSection[];
    new: DryRunNewSection[];
  };
  cases: DryRunCase[];
  summary: {
    total: number;
    approved: number;
    draft: number;
    existingSections: number;
    newSections: number;
  };
}

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
  reqCount: number;
  caseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  id: string;
  stage: string;
  alias: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

export interface LlmProvider {
  id: string;
  name: string;
  aliases: string[];
}

export type StageStatus = 'created' | 'running' | 'success' | 'failed' | 'canceled';
