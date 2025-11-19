import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { CommitEntity } from './commit.entity';
import { Intern } from '../entities/intern.entity';

@Entity('repos')
export class RepoEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'repo_name' })
  repoName!: string;

  @Column({ name: 'github_url' })
  githubUrl!: string;

  @ManyToOne(() => Intern, (intern) => intern.repos, { onDelete: 'CASCADE' })
  intern!: Intern;

  @OneToMany(() => CommitEntity, (commit) => commit.repo)
  commits!: CommitEntity[];
}
