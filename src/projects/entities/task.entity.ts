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

  // Raw Foreign Key column
  @Column({ type: 'uuid', nullable: false })
  milestoneId!: string;

  // 🔥 CRITICAL FIX: Ensure explicit nullable Date type
  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date | null; 

  // --- Relationships ---

  @ManyToOne(() => Milestone, milestone => milestone.tasks, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'milestoneId' })
  milestone!: Milestone;

  @ManyToOne(() => User, (user) => user.assignedTasks, {
        nullable: true,
        onDelete: 'SET NULL'
    })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User | null;

  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}