import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Checklist } from './checklist.entity';
import { ChecklistTemplate } from './checklist-template.entity';
import { InternChecklist } from './intern-checklist.entity';

@Entity('checklist_items')
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'uuid' })
  checklistId!: string;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string | null;

  // Many items belong to a single checklist
  @ManyToOne(() => Checklist, checklist => checklist.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checklistId' })
  checklist!: Checklist;

  // Optional link to template item
  @ManyToOne(() => ChecklistTemplate, template => template.items, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template?: ChecklistTemplate;

  // Link to InternChecklist to track completion per intern (optional)
  @ManyToOne(() => InternChecklist, ic => ic.items, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'internChecklistId' })
  internChecklist?: InternChecklist;

  @Column({ default: false })
  isCompleted!: boolean;

  @Column({ type: 'text', nullable: true })
  text?: string | null;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
