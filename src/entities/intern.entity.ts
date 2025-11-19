import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '@/users/entities/users.entity';
import { RepoEntity } from '../entities/repo.entity';
import { CommitEntity } from '../entities/commit.entity';
import { NlpSummary } from '../analytics/entities/nlp-summary.entity';
import { GitHubMetrics } from '@/github/entities/github-metrics.entity';

@Entity('interns')
export class Intern {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  github_username!: string;

  @Column()
  userId!: string;

  @OneToMany(() => GitHubMetrics, (gm) => gm.intern, { cascade: true })
  githubMetrics!: GitHubMetrics[];

  @OneToMany(() => RepoEntity, (repo) => repo.intern)
  repos!: RepoEntity[];

  @OneToMany(() => CommitEntity, (commit) => commit.intern)
  commits!: CommitEntity[];

  @OneToMany(() => NlpSummary, (s) => (s as any).intern)
  nlpSummaries?: NlpSummary[];

    @ManyToOne(() => User, (user) => user.interns)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
