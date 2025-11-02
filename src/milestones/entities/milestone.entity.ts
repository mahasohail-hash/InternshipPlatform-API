// src/projects/entities/milestone.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../projects/entities/task.entity';
import { AppModule } from '../../../src/app.module';

@Entity('milestones')
export class Milestone {
    @PrimaryGeneratedColumn('uuid') id!: string; // FIX
    @Column() title!: string; // FIX
    @Column({ nullable: true }) dueDate?: Date; // Optional uses '?'

    @ManyToOne(() => Project, project => project.milestones, { onDelete: 'CASCADE' })
    project!: Project; // FIX
@OneToMany(() => Task, task => task.milestone)
tasks!: Task[]; // FIX: Initialized as empty array
}