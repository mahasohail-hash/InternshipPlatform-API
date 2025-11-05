import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { User } from '../users/entities/users.entity';
import { EvaluationsController } from './evaluations.controller';
import { ConfigModule } from '@nestjs/config';

// --- Modules ---
import { UsersModule } from '../users/users.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ProjectsModule } from '../projects/projects.module'; // CRITICAL FIX: Import ProjectsModule
import { GithubModule } from '../github/github.module';

// --- Services ---
import { EvaluationsService } from './evaluations.service';
import { DraftingService } from '../ai/drafting.service'; // CRITICAL FIX: Import DraftingService
// If you want to use mocks specifically, define them in a dedicated mock module and import here
// import { MockLlmService } from '../mock/mock-external-services.service';

@Module({
  imports: [
    ConfigModule, // Make ConfigService available
    TypeOrmModule.forFeature([Evaluation, User]),
    GithubModule,
    forwardRef(() => AnalyticsModule), // Use forwardRef for potential circular dependency with Analytics
    forwardRef(() => UsersModule), // Use forwardRef for UsersModule
    forwardRef(() => ProjectsModule), // CRITICAL FIX: Use forwardRef for ProjectsModule
  ],
  controllers: [EvaluationsController],
  providers: [
    EvaluationsService,
    DraftingService, // CRITICAL FIX: Provide DraftingService
    // If you need to explicitly provide a mock for LLM, uncomment this and ensure MockLlmService is defined
    // { provide: 'LLM_SERVICE', useClass: MockLlmService },
  ],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}