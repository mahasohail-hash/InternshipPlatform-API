import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ChecklistTemplateItem } from './checklist-template-item.entity';
// Import the new Checklist (instance) entity
import { Checklist } from './checklist.entity';
//import { forwardRef } from '@nestjs/common';
// Remove the import for User, you don't need it here anymore

@Entity('checklist_templates')
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true }) // You should have this
  name!: string;

  @Column({ nullable: true })
  description!: string;

  // This relationship is correct
@OneToMany(() => ChecklistTemplateItem, item => item.template, { cascade: true }) 
items!: ChecklistTemplateItem[];
  
  @OneToMany(() => Checklist, (checklist) => checklist.template)
  checklistInstances!: Checklist[];
}