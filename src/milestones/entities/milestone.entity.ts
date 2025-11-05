import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity'; // CRITICAL FIX: Correct import path
import { Task } from '../../projects/entities/task.entity'; // CRITICAL FIX: Correct import path

@Entity('milestones')
export class Milestone {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    title!: string; // CRITICAL FIX: Use 'title' consistently

    @Column({ nullable: true, type: 'text' })
    description?: string; // Add description field if DTO/frontend expects it

@Column({ type: 'timestamp', nullable: true })
    dueDate?: Date | null; // Add dueDate if milestone itself has a due date

    // Foreign key to Project
    @Column({ type: 'uuid', nullable: false })
    projectId!: string; // Explicit foreign key column

    @ManyToOne(() => Project, project => project.milestones, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'projectId' }) // Specify the foreign key column name
    project!: Project;

    // One-to-Many relationship with Task, cascade operations
    @OneToMany(() => Task, task => task.milestone, { cascade: true }) // CRITICAL FIX: Add cascade: true
    tasks!: Task[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}