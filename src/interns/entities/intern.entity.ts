// src/interns/entities/intern.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '@/users/entities/users.entity';
import { InternChecklist } from '@/checklists/entities/intern-checklist.entity';
import { Mentor } from '@/mentor/entities/mentor.entity';
import { Project } from '@/projects/entities/project.entity';
import { Checklist } from '@/checklists/entities/checklist.entity';
import { Repo } from '@/repo/entities/repo.entity';

@Entity('interns')
export class Intern {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  // link with User (HR or account info)
  @ManyToOne(() => User, user => user.interns, { onDelete: 'CASCADE', eager: true })
  user!: User;

  // InternChecklist relation
  @OneToMany(() => InternChecklist, ic => ic.intern, { cascade: true })
  internChecklists!: InternChecklist[];

  // Mentors assigned to this intern
  @ManyToMany(() => Mentor, mentor => mentor.interns)
  mentors?: Mentor[];

  // Projects assigned to this intern
  @ManyToMany(() => Project, project => project.interns)
  @JoinTable({
    name: 'project_interns',
    joinColumn: { name: 'intern_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'project_id', referencedColumnName: 'id' },
  })
  projects?: Project[];

  @OneToMany(() => Repo, repo => repo.intern)
repos!: Repo[];


  // Checklists assigned to this intern
  @ManyToMany(() => Checklist, checklist => checklist.interns)
  @JoinTable()
  checklists?: Checklist[];
  github_username: any;
  githubMetrics: any;
   
}