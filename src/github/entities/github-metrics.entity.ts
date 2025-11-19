import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Intern } from '@/entities/intern.entity';
import { User } from '@/users/entities/users.entity';

@Entity('github_metrics')
export class GitHubMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.githubMetrics, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Intern, (intern) => intern.githubMetrics, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'intern_id' })
  intern?: Intern | null;

  @Column({ name: 'intern_id', type: 'uuid', nullable: true })
  internId?: string | null;

  @Column()
  githubUsername!: string;

  @Column()
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
  rawContributions?: any;

  @CreateDateColumn()
  createdAt!: Date;
}