// src/nlp/nlp.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NlpService } from './nlp.service';
import { NlpSummary } from '@/analytics/entities/nlp-summary.entity';
import { User } from '@/users/entities/users.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NlpSummary]),
    UsersModule, // <-- ADD THIS
  ],
  providers: [NlpService],
  exports: [NlpService]
})
export class NlpModule {}
