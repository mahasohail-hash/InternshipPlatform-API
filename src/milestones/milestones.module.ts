// src/milestones/milestones.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { Milestone } from './entities/milestone.entity';
import { ProjectsModule } from '../projects/projects.module'; // To verify project ownership
import { UsersModule } from '../users/users.module'; // To verify mentor

@Module({
  imports: [
    TypeOrmModule.forFeature([Milestone]),
    ProjectsModule, // Import ProjectsModule to use ProjectsService
    UsersModule,    // Import UsersModule to use UsersService (for mentor context)
  ],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService], // Export MilestonesService for TasksModule
})
export class MilestonesModule {}