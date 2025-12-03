import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
} from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { InternChecklist } from '../../checklists/entities/intern-checklist.entity';
import { Checklist } from '../../checklists/entities/checklist.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../projects/entities/task.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { NlpSummary } from '../../analytics/entities/nlp-summary.entity';
import { GitHubMetrics } from '../../github/entities/github-metrics.entity';
import { Intern } from '@/interns/entities/intern.entity';
import { Mentor } from '@/mentor/entities/mentor.entity';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

    @Column({ nullable: true })
  provider?: string

  @Column({ type: 'enum', enum: UserRole, default: UserRole.INTERN })
  role!: UserRole;

  @Column({ nullable: true })
  githubUsername?: string;


  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken!: string | null;


  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires!: Date | null;


@Column({ nullable: true })
  providerId?: string;





  // Relations
  @OneToMany(() => InternChecklist, ic => ic.intern)
  internChecklists!: InternChecklist[];

  @OneToMany(() => Checklist, checklist => checklist.user)
  checklists!: Checklist[];

  @OneToMany(() => Project, project => project.mentor)
  mentoredProjects?: Project[];

  @OneToMany(() => Project, project => project.intern)
  assignedProjects?: Project[];

  @OneToMany(() => Intern, intern => intern.user)
interns!: Intern[];
@ManyToOne(() => Mentor, mentor => mentor.assignedChecklists)
assignedBy!: Mentor;

  @OneToMany(() => Evaluation, e => e.intern)
  receivedEvaluations!: Evaluation[];

  @OneToMany(() => Evaluation, e => e.mentor)
  givenEvaluations!: Evaluation[];

  @OneToMany(() => NlpSummary, n => n.intern)
  nlpSummaries!: NlpSummary[];

  @OneToMany(() => GitHubMetrics, g => g.intern)
  githubMetrics!: GitHubMetrics[];


  @OneToMany(() => Task, task => task.assignee)
  assignedTasks!: Task[];


  

  // Timestamps
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

    mentor: any;
  name!: string;

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  setGithubUsername() {
    if (!this.githubUsername && this.email) {
      this.githubUsername = this.email.split('@')[0];
    }
  }

  // Virtual getter
  get fullName(): string {
    return `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
  }
}
export { UserRole };

