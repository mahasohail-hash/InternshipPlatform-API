// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { UserRole } from '../common/enums/user-role.enum';
// Import other Entities
import { Project } from '../projects/entities/project.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity'; 
@Injectable()
export class AnalyticsService {
 constructor(
 @InjectRepository(User) private usersRepository: Repository<User>,
 @InjectRepository(Project) private projectsRepository: Repository<Project>,
 @InjectRepository(Evaluation) private evaluationsRepository: Repository<Evaluation>,
@InjectRepository(InternChecklist) private checklistsRepository: Repository<InternChecklist>,
 ) {}

 async getSummary() {
// 1. Total Interns Count
 const totalInterns = await this.usersRepository.count({
 where: { role: UserRole.INTERN },
 });

 // 2. Active Projects Count
const activeProjects = await this.projectsRepository.count({
 where: { status: 'Active' }, 
 });

// 3. Pending Evaluations Count
 const totalEvaluations = await this.evaluationsRepository.count();
const submittedEvaluations = await this.evaluationsRepository.count({
// where: { submitted: true } // Assuming Evaluation has a boolean 'submitted' field
 });
const pendingEvaluations = totalEvaluations - submittedEvaluations;


// 4. Checklist Completion Rate (FIXED)
    // We must fetch all checklists and their items to check them in code
    const allChecklists = await this.checklistsRepository.find({
      relations: ['items'],
    });

    const totalChecklists = allChecklists.length;

    // A checklist is "complete" if it has items AND every item is marked as completed
    const completedChecklists = allChecklists.filter(checklist =>
      checklist.items.length > 0 && // Make sure it has items
      checklist.items.every(item => item.isCompleted === true) // Check if every item is true
    ).length;

 const completionRate = totalChecklists > 0 ? (completedChecklists / totalChecklists) * 100 : 0;

 // Return the formatted metrics
 return {
totalInterns,
 activeProjects,
 pendingEvaluations,
checklistsComplete: `${completionRate.toFixed(0)}%`,
 };
 }
}