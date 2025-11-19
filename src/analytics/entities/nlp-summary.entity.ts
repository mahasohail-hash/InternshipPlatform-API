import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';

@Entity('nlp_summaries')
export class NlpSummary {
  @PrimaryGeneratedColumn()
  id!: number;

  // Relation to the User who is the intern (use your existing users table)

  @ManyToOne(() => User, (user) => user.nlpSummaries)
  @JoinColumn({ name: 'intern_id' })
  intern!: User;


  // Optional relation to a specific Evaluation row (nullable)
  @ManyToOne(() => Evaluation, (evaluation) => evaluation.id, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'evaluation_id' })
  evaluation!: Evaluation | null;

  // Flexible JSON column to store both compact and full analysis.
  @Column({ type: 'json', nullable: true })
  summaryJson!: any;

  // When this analysis was performed (optional)
  @Column({ type: 'timestamp', nullable: true })
  analysisDate!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
