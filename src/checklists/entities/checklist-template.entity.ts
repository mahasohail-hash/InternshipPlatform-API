import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ChecklistTemplateItem } from './checklist-template-item.entity';
import { Checklist } from './checklist.entity';
import { InternChecklist } from './intern-checklist.entity';

@Entity('checklist_templates')
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true,  nullable: true  })
  name!: string; 

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: true })
  title!: string;

  @OneToMany(() => ChecklistTemplateItem, (item: { template: any; }) => item.template, { cascade: true })
  items!: ChecklistTemplateItem[];

  @OneToMany(() => Checklist, (checklist: { template: any; }) => checklist.template)
  checklists!: Checklist[];

  @OneToMany(() => InternChecklist, (ic: { template: any; }) => ic.template)
  checklistInstances!: InternChecklist[];
}
