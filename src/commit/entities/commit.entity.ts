import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Repo } from '@/repo/entities/repo.entity';
@Entity('commits')
export class Commit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sha!: string;

  @Column()
  message!: string;

  @Column()
  author!: string;

  @Column()
  additions!: number;

  @Column()
  deletions!: number;

  @ManyToOne(() => Repo, repo => repo.commits, { onDelete: 'CASCADE' })
  repo!: Repo;
}
