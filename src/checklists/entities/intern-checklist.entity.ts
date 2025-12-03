import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ChecklistTemplate } from './checklist-template.entity';
import { InternChecklistItem } from './intern-checklist-item.entity';
import { Checklist } from './checklist.entity';
import { Intern } from '@/interns/entities/intern.entity';

@Entity('intern_checklists')
export class InternChecklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // When this checklist was assigned
  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;

  // Status of the checklist (all items complete or not)
  @Column({ default: false })
  isComplete!: boolean;

  // Instance of Checklist assigned to the intern
  @ManyToOne(() => Checklist, checklist => checklist.internChecklists, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'checklist_id' })
  checklist!: Checklist;

  @Column({ type: 'uuid' })
  checklistId!: string;

  // Intern assigned to this checklist
  @ManyToOne(() => Intern, intern => intern.internChecklists, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'intern_id' })
  intern!: Intern;

  @Column({ type: 'uuid' })
  internId!: string;

  // Template reference (for tracking source)
  @ManyToOne(() => ChecklistTemplate, template => template.internChecklists, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: ChecklistTemplate;

  @Column({ type: 'uuid' })
  templateId!: string;

  // Checklist items for this intern (copied from template/checklist)
  @OneToMany(() => InternChecklistItem, item => item.internChecklist, { cascade: true, eager: true })
  items!: InternChecklistItem[];

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
