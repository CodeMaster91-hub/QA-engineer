import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PipelineStage {
  REQUIREMENTS_EXTRACTED = 'requirements_extracted',
  TEST_PLAN_CREATED = 'test_plan_created',
  TEST_CASES_CREATED = 'test_cases_created',
  COVERAGE_AUDITED = 'coverage_audited',
  REVIEW = 'review',
  DRY_RUN = 'dry_run',
}

@Entity('agent_configs')
export class AgentConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  stage: PipelineStage;

  @Column({ type: 'text' })
  alias: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.1 })
  temperature: number;

  @Column({ type: 'int', default: 4096 })
  maxTokens: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
