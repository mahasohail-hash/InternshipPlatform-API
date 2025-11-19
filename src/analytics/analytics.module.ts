import { Module, forwardRef } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

// --- Entities ---
import { User } from '../users/entities/users.entity';
import { Project } from '../projects/entities/project.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { GitHubMetrics } from '../github/entities/github-metrics.entity';
import { NlpSummary } from './entities/nlp-summary.entity';
import { Task } from '../projects/entities/task.entity'; // CRITICAL FIX: Import Task for task analytics
import { HttpModule } from '@nestjs/axios';
// --- Modules ---
import { GithubModule } from '../github/github.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { UsersModule } from '../users/users.module'; // CRITICAL FIX: Import UsersModule
import { GithubService } from '../github/github.service';
import { Intern } from '@/entities/intern.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, NlpSummary,Intern, GitHubMetrics,  Project, Evaluation, InternChecklist, GitHubMetrics, Task // CRITICAL FIX: Add Task entity
    ]),
    GithubModule,
       HttpModule, 
    forwardRef(() => EvaluationsModule), // Use forwardRef for potential circular dependencies
    forwardRef(() => UsersModule), // CRITICAL FIX: Add UsersModule
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    GithubService,
    // AnalyticsService depends on GithubService and others, which are provided by their modules
  ],
  exports: [
    AnalyticsService, // Export AnalyticsService so other modules can inject it
    // TypeOrmModule.forFeature(...) // Not usually exported, entities are for internal module use
  ],
})
export class AnalyticsModule {}