import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, Column } from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { ChecklistTemplate } from './checklist-template.entity';
import { InternChecklistItem } from './intern-checklist-item.entity';

@Entity('intern_checklists')
export class InternChecklist {
 @PrimaryGeneratedColumn('uuid')
 id!: string;

  @CreateDateColumn()
  createdAt!: Date;

    @Column({ default: false })
  isComplete!: boolean;

 // Relation to the Intern
@ManyToOne(() => User, user => user.internChecklists, { // Corrected inverse side
   onDelete: 'CASCADE',
   nullable: false // Checklist must have an intern
 })
  intern!: User;

 // Relation to the Template it was created from
@ManyToOne(() => ChecklistTemplate, template => template.checklistInstances, {
   onDelete: 'SET NULL',
   nullable: true
 })
template!: ChecklistTemplate;
 // This checklist *contains* many personal items
 @OneToMany(() => InternChecklistItem, item => item.internChecklist, { cascade: true, eager: true }) // Added eager: true
 items!: InternChecklistItem[];
}