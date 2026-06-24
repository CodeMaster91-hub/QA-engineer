import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Feature } from './feature.entity';

export enum ArtifactType {
  SOURCE = 'source',
  REQUIREMENTS = 'requirements',
  TESTPLAN = 'testplan',
  TESTCASES = 'testcases',
  COVERAGE = 'coverage',
  REVIEW = 'review',
  DRY_RUN = 'dry_run',
}

@Entity('feature_artifacts')
export class FeatureArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  featureId: string;

  @ManyToOne(() => Feature, (feature) => feature.artifacts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'featureId' })
  feature: Feature;

  @Column({ type: 'text' })
  type: ArtifactType;

  @Column({ type: 'jsonb' })
  content: Record<string, any>;

  @Column({ nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
