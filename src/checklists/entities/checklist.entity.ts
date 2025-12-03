import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ChecklistTemplate } from './checklist-template.entity';
import { ChecklistItem } from './checklist-item.entity';
import { InternChecklist } from './intern-checklist.entity';
import { User } from '@/users/entities/users.entity';
import { Intern } from '@/interns/entities/intern.entity';
import { Mentor } from '@/mentor/entities/mentor.entity';

@Entity('checklists')
export class Checklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Human-facing name/title (usually copy of template.name)
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  title?: string;

  // HR user who created/assigned this checklist
  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => ChecklistTemplate, template => template.checklists, { nullable: false, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'templateId' })
  template!: ChecklistTemplate;

  @Column({ type: 'uuid' })
  templateId!: string;

  // Optional direct link to HR user (creator/assigner)
  @ManyToOne(() => User, user => user.checklists, { nullable: true })
  user?: User;

  // Optional direct many-to-many with interns (canonical link via InternChecklist)
  @ManyToMany(() => Intern, intern => intern.internChecklists, { cascade: false })
  @JoinTable({
    name: 'checklist_interns',
    joinColumn: { name: 'checklist_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'intern_id', referencedColumnName: 'id' },
  })
  interns?: Intern[];

  @ManyToOne(() => Mentor, mentor => mentor.assignedChecklists)
assignedBy!: Mentor;


  // Checklist items (cascaded and eagerly loaded)
  @OneToMany(() => ChecklistItem, item => item.checklist, { cascade: true, eager: true })
  items!: ChecklistItem[];

  // Intern-checklist assignments
  @OneToMany(() => InternChecklist, ic => ic.checklist)
  internChecklists!: InternChecklist[];

  @Column({ default: false })
  isCompleted!: boolean;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
    
}
