import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/users.entity'; // CRITICAL FIX: Correct import path

@Entity('github_metrics')
export class GitHubMetrics {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @ManyToOne(() => User, user => user.githubMetrics, { onDelete: 'CASCADE', nullable: false }) // Must be linked to an intern
  intern!: User;

  @Column({ type: 'uuid', nullable: false }) // Explicit FK column for intern
  internId!: string;

  @Column() githubUsername!: string;
  @Column() repoName!: string;

  @CreateDateColumn({ type: 'date' }) fetchDate!: Date; // Using CreateDateColumn for initial fetch date

  @Column({ default: 0 }) commits!: number;
  @Column({ default: 0 }) additions!: number;
  @Column({ default: 0 }) deletions!: number;

  @Column({ type: 'jsonb', nullable: true })
  rawContributions?: any; // To store raw API response if needed

  @UpdateDateColumn() updatedAt!: Date; // To track when the metrics were last updated
}