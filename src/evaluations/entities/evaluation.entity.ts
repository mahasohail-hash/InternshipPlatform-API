import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/users.entity'; // CRITICAL FIX: Correct import path
import { NlpSummary } from '../../analytics/entities/nlp-summary.entity'; // CRITICAL FIX: Correct import path

export enum EvaluationType {
    WEEKLY = 'Weekly Note',
    MIDPOINT = 'Midpoint Review',
    FINAL = 'Final Review',
    SELF = 'Self-Review',
}

@Entity('evaluations')
export class Evaluation {
    @PrimaryGeneratedColumn('uuid') id!: string;

    // CRITICAL FIX: Ensure these are Column decorated and match DTO/logic
    @Column({ type: 'int', nullable: true })
    score?: number;

    @Column({ type: 'text', nullable: false, default: '' }) // CRITICAL FIX: Made non-nullable with a default or ensure DTO always sends it
    feedbackText!: string;

    @Column({ type: 'enum', enum: EvaluationType, default: EvaluationType.WEEKLY, nullable: false })
    type!: EvaluationType;

    // --- Date Columns ---
    @CreateDateColumn() createdAt!: Date;
    @UpdateDateColumn() updatedAt!: Date;
    // --------------------

    // --- Relationship Fields ---
    @ManyToOne(() => User, user => user.receivedEvaluations, { onDelete: 'CASCADE', nullable: false }) // Evaluation must have an intern
    intern!: User;

    @Column({ type: 'uuid', nullable: false }) // Explicit FK column for intern
    internId!: string;

    @ManyToOne(() => User, user => user.givenEvaluations, { nullable: true, onDelete: 'SET NULL' }) // Mentor is nullable for self-reviews
    mentor?: User;

    @Column({ type: 'uuid', nullable: true }) // Explicit FK column for mentor
    mentorId?: string;

    // One-to-one relationship for NLP Summary
    @OneToOne(() => NlpSummary, nlpSummary => nlpSummary.evaluation, { nullable: true })
    @JoinColumn() // This evaluation entity 'owns' the foreign key to nlpSummary
    nlpSummary?: NlpSummary;
}