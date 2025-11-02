// src/evaluations/evaluations.module.ts (CRITICAL FIX)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { User } from '../users/entities/users.entity'; // IMPORTANT: Inject User entity here
import { EvaluationsController } from './evaluations.controller';
import { UsersModule } from '../users/users.module';
import { EvaluationsService,GithubIntegrationService, NlpService,  LlmService} from '../evaluations/evaluations.service';


@Module({
  imports: [
    // Evaluation and User entities must be listed
    UsersModule,
    TypeOrmModule.forFeature([Evaluation, User]),
    
  ],
  // ... controllers, providers, exports ...
  controllers: [EvaluationsController],
  providers: [
    EvaluationsService,
    GithubIntegrationService,
    NlpService,
    LlmService,],
})
export class EvaluationsModule {}