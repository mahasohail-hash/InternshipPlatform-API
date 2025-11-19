import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  CreateDateColumn, UpdateDateColumn,
  BeforeUpdate,
  BeforeInsert,
} from 'typeorm';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../projects/entities/task.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { NlpSummary } from '../../analytics/entities/nlp-summary.entity';
import { InternChecklist } from '../../checklists/entities/intern-checklist.entity';
import { GitHubMetrics } from '../../github/entities/github-metrics.entity';
import { Session } from '../../session/session.entity';
import { Checklist } from '../../checklists/entities/checklist.entity'; // CRITICAL FIX: Import Checklist entity
import { Intern } from '@/entities/intern.entity';
@Entity('users')
export class User {
  
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ unique: true, nullable: false }) email!: string;

  @Column({ nullable: false, select: false })
  passwordHash!: string;

  @Column({ nullable: true }) firstName?: string;
  @Column({ nullable: true }) lastName?: string;
  @Column({
    name: 'github_username',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  githubUsername!: string ;


  @Column({ type: 'enum', enum: UserRole, default: UserRole.INTERN })
  role!: UserRole;



  @OneToMany(() => Intern, (intern) => intern.user)
  interns!: Intern[];
  // --- Relations (Inverse sides) ---
  @OneToMany(() => Evaluation, evaluation => evaluation.intern)
  receivedEvaluations!: Evaluation[];

  @OneToMany(() => Evaluation, evaluation => evaluation.mentor)
  givenEvaluations!: Evaluation[];

  @OneToMany(() => InternChecklist, internChecklist => internChecklist.intern)
  internChecklists!: InternChecklist[];

  // CRITICAL FIX: Add this if the `Checklist` entity uses `user.checklists` as inverse.
  @OneToMany(() => Checklist, checklist => checklist.user)
  checklists!: Checklist[];

  @OneToMany(() => Project, project => project.mentor, { nullable: true })
  mentoredProjects?: Project[];

  @OneToMany(() => Project, project => project.intern, { nullable: true })
  assignedProjects?: Project[];

  @OneToMany(() => Task, task => task.assignee)
  assignedTasks!: Task[];

  @OneToMany(() => GitHubMetrics, metrics => metrics.intern)
  githubMetrics!: GitHubMetrics[];

  @OneToMany(() => NlpSummary, summary => summary.intern)
  nlpSummaries!: NlpSummary[];

  @OneToMany(() => Session, session => session.user)
  sessions!: Session[];

  // --- Timestamps ---
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;



// ---------- HOOKS ----------
  @BeforeInsert()
  @BeforeUpdate()
  setGithubUsername() {
    // Auto-generate GitHub username from email if missing
    if (!this.githubUsername || this.githubUsername.trim() === '') {
      if (this.email) {
        this.githubUsername = this.email.split('@')[0];
      }
    }
  }

  // ---------- VIRTUAL FIELDS ----------
  get fullName(): string {
    return `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
  }

}

export { UserRole };
