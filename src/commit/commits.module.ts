import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commit } from './entities/commit.entity';
import { CommitsService } from './commits.service';
import { CommitsController } from './commits.controller';
import { Repo } from '../repo/entities/repo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Commit, Repo])],
  providers: [CommitsService],
  controllers: [CommitsController],
  exports: [CommitsService],
})
export class CommitsModule {}
