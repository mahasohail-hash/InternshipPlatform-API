import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { GitHubMetrics } from './entities/github-metrics.entity';
import { Intern } from '@/interns/entities/intern.entity';
import { UsersModule } from '../users/users.module';
import { InsightsModule } from '../insights/insights.module';

@Module({
  imports: [
    // Register repositories
    TypeOrmModule.forFeature([GitHubMetrics, Intern]),

    // Make ConfigService and HttpService available
    ConfigModule,
    HttpModule,

    // Forward references for circular dependencies
    forwardRef(() => UsersModule),
    forwardRef(() => InsightsModule),
  ],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService], // Export service for use in other modules
})
export class GithubModule {}
