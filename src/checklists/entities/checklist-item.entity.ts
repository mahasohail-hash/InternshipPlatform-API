import { Entity, PrimaryGeneratedColumn, Column, ManyToOne ,  CreateDateColumn,} from 'typeorm';
import { Checklist } from './checklist.entity';

@Entity()
export class ChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true }) // <-- FIX: Allow this column to be null
text!: string; 

  @Column()
  title!: string;

  
  @Column({ type: 'text' })
  description!: string; 

  @Column({ default: false })
  isComplete!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null; // 

  @CreateDateColumn()
  createdAt!: Date;

  // Relation to the parent checklist instance
 @ManyToOne(() => Checklist, (checklist) => checklist.items, { 
        nullable: false, 
        onDelete: 'CASCADE' // <-- ADD THIS LINE
    }) 
    checklist!: Checklist;
}