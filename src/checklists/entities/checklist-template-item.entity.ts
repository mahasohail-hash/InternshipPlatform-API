// src/checklist/entities/checklist-template-item.entity.ts
import { Entity,JoinColumn, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'; // <-- Ensure ManyToOne is imported!
import { ChecklistTemplate } from './checklist-template.entity';
//import { forwardRef } from '@nestjs/common';
import { InternChecklistItem } from './intern-checklist-item.entity';
@Entity('checklist_template_items')
export class ChecklistTemplateItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string; // ADD '!'

   @Column({ nullable: false, type: 'varchar' })
    title!: string;

    @Column({ type: 'text', nullable: true }) 
    description!: string;

   @ManyToOne(() => ChecklistTemplate, template => template.items, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'templateId' }) 
    template!: ChecklistTemplate;
}