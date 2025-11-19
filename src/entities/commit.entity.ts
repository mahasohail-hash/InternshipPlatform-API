import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { RepoEntity } from './repo.entity';
import { Intern } from '../entities/intern.entity';

@Entity('commits')
export class CommitEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'commit_hash' })
  commitHash!: string;

  @Column()
  message!: string;

  @Column({ name: 'repo_id' })
  repoId!: number;

  @Column({ name: 'intern_id' })
  internId!: string;

  @ManyToOne(() => RepoEntity, (repo) => repo.commits, { onDelete: 'CASCADE' })
  repo!: RepoEntity;

  @ManyToOne(() => Intern, (intern) => intern.commits, { onDelete: 'CASCADE' })
  intern!: Intern;

  @CreateDateColumn({ name: 'committed_at' })
  committedAt!: Date;
}
