import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
// Import dependencies from their core files or types
import { Milestone } from './milestone.entity'; // Assuming Milestone is in the same folder or adjusted path
import { User } from '../../users/entities/users.entity'; // <-- FIX: Corrected import to singular 'user.entity'
import { AppModule } from '../../../src/app.module';

// Define possible statuses for a task
export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  BLOCKED = 'Blocked',
}

@Entity('tasks') // This decorator marks the class as a database table
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  // Raw Foreign Key column (used for direct database interaction)
  @Column({ type: 'uuid', nullable: false })
  milestoneId!: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  // --- Relationships ---

  // Many Tasks belong to one Milestone
  // NOTE: This structure is now consistent with the Milestone entity, 
  // which defines the inverse 'tasks' property.
  @ManyToOne(() => Milestone, milestone => milestone.tasks, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'milestoneId' })
  milestone!: Milestone;

  // Many Tasks can be assigned to one User (Intern) - Optional assignment
  @ManyToOne(() => User, (user) => user.assignedTasks, {
        nullable: true,
        onDelete: 'SET NULL'
    })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User | null;

  // --- Timestamps ---

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}