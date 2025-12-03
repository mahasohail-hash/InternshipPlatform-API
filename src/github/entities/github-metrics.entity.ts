import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@/users/entities/users.entity';
import { Intern } from '@/interns/entities/intern.entity';
@Entity('github_metrics')
export class GitHubMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Optional relation to User (mentor/admin who fetched or owns this metric)
  @ManyToOne(() => User, (user) => user.githubMetrics, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // Relation to Intern (who this metric belongs to)
  @ManyToOne(() => Intern, (intern) => intern.githubMetrics, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'intern_id' })
  intern?: Intern | null;

  @Column({ name: 'intern_id', type: 'uuid', nullable: true })
  internId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  githubUsername!: string;

  @Column({ type: 'varchar', length: 255 })
  repoName!: string;

  @Column({ type: 'date' })
  fetchDate!: Date;

  @Column({ type: 'int', default: 0 })
  commits!: number;

  @Column({ type: 'int', default: 0 })
  additions!: number;

  @Column({ type: 'int', default: 0 })
  deletions!: number;

  @Column({ type: 'jsonb', nullable: true })
  rawContributions?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
