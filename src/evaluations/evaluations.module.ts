import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { User } from '../users/entities/users.entity';
import { Project } from '../projects/entities/project.entity';
import { EvaluationsController } from './evaluations.controller';
import { ConfigModule } from '@nestjs/config';

// --- Modules ---
import { UsersModule } from '../users/users.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ProjectsModule } from '../projects/projects.module';
import { GithubModule } from '../github/github.module';

// --- Services ---
import { EvaluationsService } from './evaluations.service';
import { DraftingService } from '../ai/drafting.service';

@Module({
  imports: [
    ConfigModule, // Provides ConfigService for AI API keys
    TypeOrmModule.forFeature([Evaluation, User, Project]), // Entities for repository injection
    GithubModule,
    forwardRef(() => AnalyticsModule), // Circular dependency safe
    forwardRef(() => UsersModule),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [EvaluationsController],
  providers: [
    EvaluationsService,
    DraftingService, // AI Drafting service
  ],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
