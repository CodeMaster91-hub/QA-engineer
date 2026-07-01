import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { FeatureArtifact } from './feature-artifact.entity';
import { FeatureStage } from './feature-stage.entity';


export enum FeatureStatus {
  NEW = 'new',
  INGESTED = 'ingested',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'text', default: FeatureStatus.NEW })
  status: FeatureStatus;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ nullable: true })
  sourceType: string;

  @Column({ nullable: true })
  sourceFileName: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @OneToMany(() => FeatureArtifact, (artifact) => artifact.feature, {
    cascade: true,
    eager: true,
  })
  artifacts: FeatureArtifact[];

  @OneToMany(() => FeatureStage, (stage) => stage.feature, {
    cascade: true,
  })
  stages: FeatureStage[];


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
