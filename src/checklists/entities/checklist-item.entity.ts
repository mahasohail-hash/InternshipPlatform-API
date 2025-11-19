import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Checklist } from './checklist.entity';

@Entity()
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  checklistId!: string;

  @ManyToOne(() => Checklist, (checklist) => checklist.items)
  @JoinColumn({ name: 'checklistId' })
  checklist!: Checklist;

  @Column()
  title!: string;

  @Column({ default: false })
  isCompleted!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
