import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/users.entity'; // Link to Intern User
import { Evaluation } from '../../evaluations/entities/evaluation.entity'; // Link to source Evaluation

@Entity('nlp_summaries')
export class NlpSummary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Many-to-One: Many NLP summaries belong to one Intern (User)
  @ManyToOne(() => User, user => user.nlpSummaries, { onDelete: 'CASCADE' })
  intern!: User;

  // One-to-One: An NLP summary can be linked to a specific Evaluation (e.g., if we summarized one eval)
  // Or it can be an overall aggregated summary of ALL feedback for an intern (evaluation: null).
  @OneToOne(() => Evaluation, evalData => evalData.nlpSummary, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'evaluationId' }) // Specify the foreign key column name
  evaluation?: Evaluation;

  @Column({ type: 'uuid', nullable: true }) // Explicit foreign key column for evaluation
  evaluationId?: string;
  
  @CreateDateColumn()
  analysisDate!: Date; // When this summary was generated

  @Column({ type: 'jsonb' }) // PostgreSQL's native JSON type to store structured NLP output
  summaryJson!: {
    sentimentScore: string; // e.g., 'Positive', 'Negative', 'Neutral', 'N/A'
    keyThemes: string[];    // e.g., ['communication', 'problem-solving', 'code-quality']
  };

  @UpdateDateColumn()
  updatedAt!: Date; // To track when the summary was last updated
}