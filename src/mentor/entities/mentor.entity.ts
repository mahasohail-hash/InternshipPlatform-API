import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { Project } from '../../projects/entities/project.entity';
import { Checklist } from '../../checklists/entities/checklist.entity';

@Entity('mentors')
export class Mentor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @OneToMany(() => Evaluation, evals => evals.mentor)
  givenEvaluations!: Evaluation[];

  @OneToMany(() => User, user => user.mentor)
  interns!: User[];

  @OneToMany(() => Project, project => project.mentor)
  projects!: Project[];

@OneToMany(() => Checklist, checklist => checklist.assignedBy)
assignedChecklists!: Checklist[];
}
