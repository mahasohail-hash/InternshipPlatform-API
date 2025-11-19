import { Entity, JoinColumn, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ChecklistTemplate } from './checklist-template.entity';

@Entity('checklist_template_items')
export class ChecklistTemplateItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false, type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @ManyToOne(() => ChecklistTemplate, template => template.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'templateId' })
  template!: ChecklistTemplate;

  @Column()
  templateId!: string;
}
