// src/checklists/entities/intern-checklist.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/users.entity'; 
import { ChecklistTemplate } from './checklist-template.entity'; 
import { InternChecklistItem } from './intern-checklist-item.entity'; // <-- Import the NEW entity

@Entity('intern_checklists')
export class InternChecklist {
 @PrimaryGeneratedColumn('uuid') 
 id!: string; 

  @CreateDateColumn()
  createdAt!: Date;

 // Relation to the Intern
@ManyToOne(() => User, user => (user as any).internChecklists, {
   onDelete: 'CASCADE' // <-- ADD THIS: If the intern is deleted, delete their checklists
 })  intern!: User; 

 // Relation to the Template it was created from
@ManyToOne(() => ChecklistTemplate, template => template.checklistInstances, {
   onDelete: 'SET NULL',  
   nullable: true        
 })
template!: ChecklistTemplate;
 // This checklist *contains* many personal items
 @OneToMany(() => InternChecklistItem, item => item.internChecklist, { cascade: true })
 items!: InternChecklistItem[]; 
}