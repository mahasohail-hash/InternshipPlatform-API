import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToOne, 
    OneToMany, 
    ManyToMany, 
    JoinTable 
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Milestone } from './milestone.entity'; 


@Entity('projects')
export class Project {
    @PrimaryGeneratedColumn('uuid') 
    id!: string; 

    @Column() 
    title!: string; 

    @Column({ nullable: true, type: 'text' }) 
    description?: string; 

    @Column({ default: 'Active' }) 
    status!: string; 

    // --- Relationships ---

    // Mentor relationship (ManyToOne)
    @ManyToOne(() => User, user => user.mentoredProjects, { onDelete: 'SET NULL', nullable: true }) // Added nullable: true
    mentor?: User | null; // <-- Changed to optional

    // Intern relationship (ManyToOne - assuming one main intern per project)
    @ManyToOne(() => User, user => user.assignedProjects, { onDelete: 'CASCADE', nullable: true }) // Added nullable: true
    intern?: User | null; // <-- Changed to optional

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
}