import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from '../../users/entities/users.entity'; // Link to intern and mentor
import { NlpSummary } from '../../analytics/entities/nlp-summary.entity'; // Optional NLP summary

export enum EvaluationType {
  WEEKLY = 'Weekly Note',
  MIDPOINT = 'Midpoint Review',
  FINAL = 'Final Review',
  SELF = 'Self-Review',
}

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Optional score for the evaluation
  @Column({ type: 'int', nullable: true })
  score?: number;

  // Feedback text, required but default to empty string
  @Column({ type: 'text', nullable: false, default: '' })
  feedbackText!: string;

  // Type of evaluation (Weekly, Midpoint, Final, Self)
  @Column({ type: 'enum', enum: EvaluationType, default: EvaluationType.WEEKLY, nullable: false })
  type!: EvaluationType;

  // Timestamp columns
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // --- Relationships ---

  // Intern receiving the evaluation
  @ManyToOne(() => User, user => user.receivedEvaluations, { onDelete: 'CASCADE', nullable: false })
  intern!: User;

  @Column({ type: 'uuid', nullable: false })
  internId!: string;

  // Mentor giving the evaluation (nullable for self-review)
  @ManyToOne(() => User, user => user.givenEvaluations, { nullable: true, onDelete: 'SET NULL' })
  mentor?: User;

  @Column({ type: 'uuid', nullable: true })
  mentorId?: string;

  // Optional NLP summary linked to this evaluation
  @OneToOne(() => NlpSummary, nlpSummary => nlpSummary.evaluation, { nullable: true })
  @JoinColumn() // Evaluation owns the FK
  nlpSummary?: NlpSummary;
}
