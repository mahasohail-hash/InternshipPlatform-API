import { 
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity'; 
import { Task } from './task.entity'; // <-- FIX: Path corrected to './task.entity'
import { User } from '../../users/entities/users.entity';
import { AppModule } from '../../../src/app.module';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'uuid', nullable: false }) 
  projectId!: string; 
  
  @ManyToOne(() => Project, project => project.milestones, { onDelete: 'CASCADE', nullable: false })
  project!: Project;

  @OneToMany(() => Task, task => task.milestone, { cascade: true }) 
  tasks!: Task[];
    
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}