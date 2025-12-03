import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChecklistTemplateItem } from './checklist-template-item.entity';
import { Checklist } from './checklist.entity';
import { InternChecklist } from './intern-checklist.entity';

@Entity('checklist_templates')
@Unique(['name'])
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // Template items (eagerly loaded, cascaded on insert/update)
  @OneToMany(() => ChecklistTemplateItem, item => item.template, { cascade: true, eager: true })
  items!: ChecklistTemplateItem[];

  // Real checklists created from this template
  @OneToMany(() => Checklist, checklist => checklist.template)
  checklists!: Checklist[];

  // Links to intern-checklist assignments derived from this template
  @OneToMany(() => InternChecklist, ic => ic.template)
  internChecklists!: InternChecklist[];

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
