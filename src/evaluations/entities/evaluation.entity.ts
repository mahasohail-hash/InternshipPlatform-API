import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne, 
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
// Correctly import User
import { User } from '../../users/entities/users.entity'; // Adjust path if needed

// --- FIX: Add 'export' ---
export enum EvaluationType {
  WEEKLY = 'Weekly Note',
  MIDPOINT = 'Midpoint Review',
  FINAL = 'Final Review',
  SELF = 'Self-Review',
}
// --- End Fix ---

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: EvaluationType,
    nullable: false,
  })
  type!: EvaluationType;

  @Column({ type: 'int', nullable: false })
  score!: number;

  @Column({ type: 'text', nullable: false })
  feedbackText!: string;

  @Column({ type: 'boolean', default: false })
  submitted!: boolean;

  @ManyToOne(() => User, user => user.receivedEvaluations, { nullable: false, onDelete: 'CASCADE' }) // Was evaluationsAsIntern
    intern!: User;

    @ManyToOne(() => User, user => user.givenEvaluations, { nullable: false, onDelete: 'SET NULL' }) // Was evaluationsAsMentor
    mentor!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

}