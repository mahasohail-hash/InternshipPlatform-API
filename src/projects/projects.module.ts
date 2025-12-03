import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

// --- Entities ---
import { Project } from './entities/project.entity';
import { Milestone } from './entities/milestone.entity';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/users.entity'; // Ensure User entity is imported

// --- Modules ---
import { UsersModule } from '../users/users.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Milestone, Task, User]), // Include User for project relations
    forwardRef(() => UsersModule),
    forwardRef(() => EvaluationsModule),
    forwardRef(() => MilestonesModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService], // Make ProjectsService available for other modules
})
export class ProjectsModule {}
