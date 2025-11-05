import { Module, forwardRef } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ConfigModule } from '@nestjs/config';

// --- Modules ---
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UsersModule),
    forwardRef(() => ProjectsModule),
    forwardRef(() => EvaluationsModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => GithubModule), // Needed for github data for reports
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}