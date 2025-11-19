import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
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

  @ManyToOne(() => User, user => user.internChecklists, { onDelete: 'CASCADE', nullable: false })
  intern!: User;

  @Column()
  templateId!: string;

  @ManyToOne(() => ChecklistTemplate, template => template.checklistInstances, { nullable: false })
  @JoinColumn({ name: 'templateId' })
  template!: ChecklistTemplate;

  @OneToMany(() => InternChecklistItem, item => item.internChecklist, { cascade: true, eager: true })
  items!: InternChecklistItem[];
}
