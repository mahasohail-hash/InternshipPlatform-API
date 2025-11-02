import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { ChecklistTemplate } from './checklist-template.entity';
import { ChecklistItem } from './checklist-item.entity';

@Entity()
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string; // Copied from the template

  @CreateDateColumn()
  createdAt!: Date;

 @ManyToOne(() => User, (user) => user.checklists, { onDelete: 'CASCADE' }) // <-- Ensure 'user.checklists' matches User entity
  user!: User;
  // --- THIS IS THE FIX ---
  // Add onDelete: 'CASCADE' to the relationship
  @ManyToOne(
    () => ChecklistTemplate,
    (template) => template.checklistInstances,
    { onDelete: 'CASCADE' } // Added this too for consistency
  )
  template!: ChecklistTemplate;
  // -----------------------

  // Cascade delete is usually good here too: if a checklist is deleted, delete its items
  @OneToMany(() => ChecklistItem, (item) => item.checklist, { cascade: true })
  items!: ChecklistItem[];
}
