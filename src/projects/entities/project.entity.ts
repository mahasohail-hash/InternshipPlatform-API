import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  OneToMany, 
  ManyToMany, 
  JoinColumn, 
  JoinTable, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Milestone } from './milestone.entity';
import { Task } from './task.entity';
import { UserRole } from '../../common/enums/user-role.enum';

export enum ProjectStatus {
  PLANNING = 'Planning',
  ACTIVE = 'Active',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold',
  BLOCKED = 'Blocked',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  title!: string;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNING, nullable: false })
  status!: ProjectStatus;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  mentorId?: string;

  @ManyToOne(() => User, user => user.mentoredProjects, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'mentorId' })
  mentor?: User | null;

  @Column({ type: 'uuid', nullable: true })
  internId?: string;

  @ManyToOne(() => User, user => user.assignedProjects, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'internId' })
  intern?: User | null;

  // Optional Many-to-Many relationship for multiple interns
  @ManyToMany(() => User)
  @JoinTable({
    name: 'project_interns_user',
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  interns!: User[];

  @Column({ default: false })
  isPrimary!: boolean;

  // Milestones under this project
  @OneToMany(() => Milestone, milestone => milestone.project, { cascade: true, eager: true })
  milestones!: Milestone[];

 @OneToMany(() => Task, task => task.project, {
        eager: true, // Only one side is eager
    })
    tasks!: Task[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
