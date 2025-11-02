// src/analytics/entities/github-metrics.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/users.entity'; // Your User Entity

@Entity('github_metrics')
export class GitHubMetrics {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    internUsername!: string; // GitHub username

    @Column({ type: 'date' })
    dateRetrieved!: Date; // When the data was fetched

    @Column({ type: 'int', default: 0 })
    totalCommits!: number;

    @Column({ type: 'int', default: 0 })
    linesAdded!: number;

    @Column({ type: 'int', default: 0 })
    linesDeleted!: number;

    // Link to the intern
    @ManyToOne(() => User, user => user.githubMetrics)
    intern!: User;
}