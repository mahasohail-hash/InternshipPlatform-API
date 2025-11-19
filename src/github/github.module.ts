import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubMetrics } from './entities/github-metrics.entity';
import { User } from '../users/entities/users.entity';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';
import { Intern } from '@/entities/intern.entity';
import { InsightsModule } from '../insights/insights.module'; // Changed AnalyticsModule to InsightsModule as per your structure

@Module({
  imports: [
    TypeOrmModule.forFeature([GitHubMetrics, Intern, User]),
    ConfigModule,
    HttpModule,
    forwardRef(() => UsersModule),
    forwardRef(() => InsightsModule), // Use InsightsModule for the forwardRef
  ],
  providers: [GithubService],
  controllers: [GithubController],
  exports: [GithubService],
})
export class GithubModule {}