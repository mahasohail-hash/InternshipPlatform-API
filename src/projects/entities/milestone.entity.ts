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
import { Task } from './task.entity'; // <-- FIX: Path corrected to './task.entity'
import { User } from '../../users/entities/users.entity';
import { AppModule } from '../../../src/app.module';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false }) // CRITICAL FIX: Ensure title is non-nullable
    title!: string;
 @Column({ type: 'text', nullable: true })
    description?: string;
@Column({ type: 'timestamp', nullable: true })
    dueDate?: Date;

  @Column({ type: 'uuid', nullable: false }) 
  projectId!: string; 
  

@OneToMany(() => Task, task => task.milestone, { cascade: true, eager: true }) // CRITICAL FIX: Add cascade: true AND eager: true for loading
tasks!: Task[];
    
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
@ManyToOne(() => Project, project => project.milestones, { onDelete: 'CASCADE', nullable: false })
@JoinColumn({ name: 'projectId' }) // Specify the foreign key column name
project!: Project;


}

