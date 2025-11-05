
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
// --- Entities ---
import { Project } from './entities/project.entity';
import { Milestone } from './entities/milestone.entity';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/users.entity'; // CRITICAL FIX: Import User entity for ProjectService

// --- Modules ---
import { UsersModule } from '../users/users.module'; // CRITICAL FIX: Import UsersModule
import { EvaluationsModule } from '../evaluations/evaluations.module'; // CRITICAL FIX: Import EvaluationsModule
import { MilestonesModule } from '../milestones/milestones.module'; // CRITICAL FIX: Import MilestonesModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Milestone, Task, User]), // CRITICAL FIX: Add User entity
    forwardRef(() => UsersModule),
    forwardRef(() => EvaluationsModule), // Use forwardRef
    forwardRef(() => MilestonesModule), // Use forwardRef
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService], // Export ProjectsService for other modules
})
export class ProjectsModule {}