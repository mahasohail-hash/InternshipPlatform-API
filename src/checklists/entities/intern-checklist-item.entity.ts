import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { InternChecklist } from './intern-checklist.entity';

@Entity('intern_checklist_items')
export class InternChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Item title (copied from template or checklist item)
  @Column({ type: 'varchar', nullable: false })
  title!: string;

  // Optional description
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // Completion status
  @Column({ default: false })
  isCompleted!: boolean;

  // When completed (nullable)
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  // Relation to parent InternChecklist
  @ManyToOne(() => InternChecklist, ic => ic.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'intern_checklist_id' })
  internChecklist!: InternChecklist;

  // Foreign key column
  @Column({ type: 'uuid', name: 'intern_checklist_id' })
  internChecklistId!: string;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
