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

@Entity('checklists') // Renamed table to make it distinct from intern_checklists
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  // CRITICAL FIX: The inverse side needs to exist on the User entity.
  // Assuming `User.checklists` (a new property on User) for this.
  @ManyToOne(() => User, (user) => user.checklists, { onDelete: 'CASCADE', nullable: false })
  user!: User; // The user to whom this checklist instance is assigned.

  @ManyToOne(
    () => ChecklistTemplate,
    (template) => template.checklistInstances,
    { onDelete: 'SET NULL', nullable: true }
  )
  template!: ChecklistTemplate;

  @OneToMany(() => ChecklistItem, (item) => item.checklist, { cascade: true, eager: true })
  items!: ChecklistItem[];
}