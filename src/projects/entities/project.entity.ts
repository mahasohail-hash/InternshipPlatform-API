import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToOne, 
    OneToMany, 
    ManyToMany, 
    JoinColumn, // CRITICAL FIX: Import JoinColumn
    CreateDateColumn, // CRITICAL FIX: Import CreateDateColumn
    UpdateDateColumn,
    JoinTable 
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Milestone } from './milestone.entity'; 
import { UserRole } from '../../common/enums/user-role.enum'; // For potential enum mapping
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

    @Column({ nullable: false }) // CRITICAL FIX: Ensure title is non-nullable
title!: string;

@Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNING, nullable: false }) // CRITICAL FIX: Use ProjectStatus enum
status!: ProjectStatus;

    @Column({ nullable: true, type: 'text' }) 
    description?: string; 

   @Column({ type: 'uuid', nullable: true }) // Explicit FK column for mentor
mentorId?: string;

    // --- Relationships ---

    // Mentor relationship (ManyToOne)
    @ManyToOne(() => User, user => user.mentoredProjects, { onDelete: 'SET NULL', nullable: true }) // Added nullable: true
    mentor?: User | null; // <-- Changed to optional

    // Intern relationship (ManyToOne - assuming one main intern per project)
  @ManyToOne(() => User, user => user.assignedProjects, { onDelete: 'SET NULL', nullable: true })
@JoinColumn({ name: 'internId' }) // Specify the foreign key column name
intern?: User | null; // <-- Changed to optional
@Column({ type: 'uuid', nullable: true })
    internId?: string | null;
    // --- FIX #3: Kept ManyToMany for now, but review if you only need the ManyToOne 'intern' relationship ---
    // Relation: A project can have multiple Interns (if needed)
    @ManyToMany(() => User)
    @JoinTable({
        name: 'project_interns_user', // Optional: specify join table name
        joinColumn: { name: 'projectId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
    })
    interns!: User[];

    // Milestones relationship (OneToMany)
    @OneToMany(() => Milestone, milestone => milestone.project, { cascade: true })
    milestones!: Milestone[];
@CreateDateColumn() createdAt!: Date;
@UpdateDateColumn() updatedAt!: Date;

}