import { Module, forwardRef } from '@nestjs/common'; // CRITICAL FIX: Add forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubMetrics } from './entities/github-metrics.entity';
import { User } from '../users/entities/users.entity'; // CRITICAL FIX: Correct import path
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module'; // CRITICAL FIX: Import UsersModule

@Module({
  imports: [
    TypeOrmModule.forFeature([GitHubMetrics, User]),
    ConfigModule,
    forwardRef(() => UsersModule), // CRITICAL FIX: Use forwardRef for UsersModule due to potential circular dependency
  ],
  providers: [GithubService],
  controllers: [GithubController],
  exports: [GithubService], // Export so other modules (like Analytics) can inject it
})
export class GithubModule {}