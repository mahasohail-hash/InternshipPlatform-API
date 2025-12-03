import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChecklistTemplate } from './checklist-template.entity';
import { ChecklistItem } from './checklist-item.entity';

@Entity('checklist_template_items')
export class ChecklistTemplateItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  text?: string | null;

  @Column({ type: 'uuid' })
  templateId!: string;

  // Link to parent template
  @ManyToOne(() => ChecklistTemplate, template => template.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template!: ChecklistTemplate;

  // Optional: link to checklist items created from this template
  // This helps track which checklist items originated from this template
  @ManyToOne(() => ChecklistItem, checklistItem => checklistItem.template, { nullable: true, onDelete: 'SET NULL' })
  checklistItem?: ChecklistItem;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
