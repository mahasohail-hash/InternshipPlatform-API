import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Intern } from '@/interns/entities/intern.entity';
import { Commit } from '@/commit/entities/commit.entity';
@Entity('repos')
export class Repo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  url!: string;

  @Column({ default: 0 })
  stars!: number;

  @Column({ default: 0 })
  forks!: number;

  @ManyToOne(() => Intern, intern => intern.repos, { onDelete: 'CASCADE' })
  intern!: Intern;

  @OneToMany(() => Commit, commit => commit.repo)
  commits!: Commit[];
}
