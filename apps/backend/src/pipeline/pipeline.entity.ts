import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Feature } from '../features/feature.entity';

export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  BLOCKED = 'blocked',
  WAITING_FOR_QA = 'waiting_for_qa',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PipelineStage {
  NEW = 'new',
  SOURCE_INGESTED = 'source_ingested',
  REQUIREMENTS_EXTRACTED = 'requirements_extracted',
  TEST_PLAN_CREATED = 'test_plan_created',
  TEST_CASES_CREATED = 'test_cases_created',
  COVERAGE_AUDITED = 'coverage_audited',
  REVIEW = 'review',
  DRY_RUN_COMPLETED = 'dry_run_completed',
  PUBLISHED = 'published',
}

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  PipelineStage.NEW,
  PipelineStage.SOURCE_INGESTED,
  PipelineStage.REQUIREMENTS_EXTRACTED,
  PipelineStage.TEST_PLAN_CREATED,
  PipelineStage.TEST_CASES_CREATED,
  PipelineStage.COVERAGE_AUDITED,
  PipelineStage.REVIEW,
  PipelineStage.DRY_RUN_COMPLETED,
  PipelineStage.PUBLISHED,
];

export interface PipelineQuestion {
  question: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  stage: string;
}

@Entity('pipelines')
export class Pipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  featureId: string;

  @ManyToOne(() => Feature, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'featureId' })
  feature: Feature;

  @Column({ type: 'text', default: PipelineStatus.IDLE })
  status: PipelineStatus;

  @Column({ type: 'text', default: PipelineStage.NEW })
  currentStage: PipelineStage;

  @Column({ type: 'jsonb', default: {} })
  stageResults: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'jsonb', default: '[]' })
  questions: PipelineQuestion[];

  @Column({ type: 'text', nullable: true })
  blockedStage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  coverageGaps: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
