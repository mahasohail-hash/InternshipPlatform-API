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
import { Project } from './project.entity'; 
import { Task } from './task.entity';
import { User } from '../../users/entities/users.entity';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  // Link to project
  @Column({ type: 'uuid', nullable: false })
  projectId!: string;

 @ManyToOne(() => Project, project => project.milestones, {
  onDelete: 'CASCADE',
  nullable: false,
})
@JoinColumn({ name: 'projectId' })
project?: Project;
  @OneToMany(() => Milestone, milestone => milestone.project, {
    eager: true, // Keep eager only on this side
  })
  milestones!: Milestone[];


  // Optional: track which HR/User created this milestone
  @Column({ type: 'uuid', nullable: true })
  hrUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'hrUserId' })
  hrUser?: User;

  // Tasks under this milestone

  @OneToMany(() => Task, task => task.milestone, { eager: true })
  tasks!: Task[];


  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
