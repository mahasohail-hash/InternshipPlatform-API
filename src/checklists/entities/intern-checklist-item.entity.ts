// src/checklists/entities/intern-checklist-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne,JoinColumn, CreateDateColumn } from 'typeorm';
import { InternChecklist } from './intern-checklist.entity';

@Entity('intern_checklist_items')
export class InternChecklistItem {
 @PrimaryGeneratedColumn('uuid')
 id!: string;

 @Column()
 title!: string; // Copied from the template

  @Column({ type: 'text', nullable: true })
  description?: string; // Copied from the template

 @Column({ default: false })
 isCompleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;
  
  @CreateDateColumn()
  createdAt!: Date;

// Relation to the parent checklist


@ManyToOne(() => InternChecklist, checklist => checklist.items, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'internChecklistId' }) // <-- CRITICAL: ENSURE THIS IS PRESENT
internChecklist!: InternChecklist;

// And the FK column itself (optional, but good for debugging)
@Column({ type: 'uuid', nullable: true })
internChecklistId?: string;
}