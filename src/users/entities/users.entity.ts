// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany, 
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { Checklist } from '../../checklists/entities/checklist.entity'; 
import { Project } from '../../projects/entities/project.entity';    
import { Task } from '../../projects/entities/task.entity';       
import { UserRole } from '../../common/enums/user-role.enum'; 
import { InternChecklist } from '../../checklists/entities/intern-checklist.entity'; 
import { GitHubMetrics } from '../../analytics/entities/github-metrics.entity'; // <-- Import the new entity
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, nullable: false })
  email!: string;

  @Column({ nullable: true , select: false }) // select: false hides it in standard queries
  password!: string;

@Column({ nullable: true }) // <-- Must match DB
    firstName?: string; // <-- Change ! to ?

    @Column({ nullable: true }) // <-- Must match DB
    lastName?: string;

@Column({ nullable: true }) // Must be nullable because Mentors/HR won't have one
    githubUsername?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.INTERN }) // Use 'enum' type
  role!: UserRole;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.intern)
  receivedEvaluations!: Evaluation[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.mentor)
  givenEvaluations!: Evaluation[];

  @OneToMany(() => Checklist, checklist => checklist.user) 
  checklists!: Checklist[];

  @OneToMany(() => Project, project => project.mentor)
  mentoredProjects!: Project[];

  @ManyToMany(() => Project, project => project.interns) // If using ManyToMany interns on Project
  projectsAsIntern!: Project[];

  @OneToMany(() => Project, project => project.intern)
  assignedProjects!: Project[]; // Note: Usually an intern has one project, check your logic/relation type

  @OneToMany(() => Task, task => task.assignee) // Assuming Task uses 'assignee'
  assignedTasks!: Task[];

  @OneToMany(() => InternChecklist, (checklist) => checklist.intern)
  internChecklists!: InternChecklist[];

@OneToMany(() => GitHubMetrics, metrics => metrics.intern)
    githubMetrics!: GitHubMetrics[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}