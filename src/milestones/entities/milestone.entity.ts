import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../projects/entities/task.entity';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  title!: string; // Ensure title is always required

  @Column({ type: 'text', nullable: true })
  description?: string; // Optional description

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date | null; // Optional due date

  // Foreign key to Project
  @Column({ type: 'uuid', nullable: false })
  projectId!: string;

  @ManyToOne(() => Project, project => project.milestones, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'projectId' }) // Explicit FK column
  project!: Project;

  // One-to-Many relation with Task
  @OneToMany(() => Task, task => task.milestone, { cascade: true, eager: true })
  tasks!: Task[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
