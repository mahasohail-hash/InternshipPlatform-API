// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
// Import other Entities for counts (Project, Evaluation, InternChecklist)
// Assuming you have these entities created as per your plan
import { Project } from '../projects/entities/project.entity'; 
import { Evaluation } from './../evaluations/entities/evaluation.entity'; 
import { InternChecklist } from '../checklists/entities/intern-checklist.entity'; 
import { GitHubMetrics } from './entities/github-metrics.entity';
import { UsersModule } from '../users/users.module';
import { GitHubService } from './github.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Project, Evaluation, InternChecklist,GitHubMetrics]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService,GitHubService],
  exports: [GitHubService],
})
export class AnalyticsModule {}