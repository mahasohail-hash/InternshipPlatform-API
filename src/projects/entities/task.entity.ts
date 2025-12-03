// src/projects/entities/task.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Milestone } from './milestone.entity';
import { User } from '../../users/entities/users.entity';
import { Project } from './project.entity';

// Define possible statuses for a task
export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  BLOCKED = 'Blocked',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    nullable: false,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date | null;

  // Foreign Key to Milestone
  @Column({ type: 'uuid', nullable: false })
  milestoneId!: string;

  @ManyToOne(() => Milestone, milestone => milestone.tasks, {
    onDelete: 'CASCADE',
    nullable: false,
    
  })
  @JoinColumn({ name: 'milestoneId' })
  milestone?: Milestone; // <-- make optional for DeepPartial

  // Foreign Key to Assignee (User: HR or Intern)
  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @ManyToOne(() => User, user => user.assignedTasks, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User | null;

  // Foreign Key to Project (optional direct link for easier querying)
  @Column({ type: 'uuid', nullable: true })
  projectId?: string;

  @ManyToOne(() => Project, project => project.tasks, {
    onDelete: 'CASCADE',
    nullable: true,
   
  })
  @JoinColumn({ name: 'projectId' })
  project?: Project | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
