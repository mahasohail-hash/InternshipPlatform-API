import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { ChecklistTemplate } from './checklist-template.entity';
import { ChecklistItem } from './checklist-item.entity';

@Entity('checklists')
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  name!: string;

  @Column()
  title!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, user => user.checklists)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => ChecklistItem, item => item.checklist)
  items!: ChecklistItem[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => ChecklistTemplate, template => template.checklists, { nullable: false })
  @JoinColumn({ name: 'templateId' })
  template!: ChecklistTemplate;

  @Column({ nullable: false })
  templateId!: string;
}
