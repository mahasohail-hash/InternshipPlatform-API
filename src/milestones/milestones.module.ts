import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilestonesService } from './milestones.service';
import { MilestonesController } from './milestones.controller';
import { Milestone } from './entities/milestone.entity';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../projects/entities/task.entity'; // CRITICAL FIX: Import Task entity

@Module({
  imports: [
    // CRITICAL FIX: Add Task entity here so TaskRepository can be injected into MilestonesService
    TypeOrmModule.forFeature([Milestone, Project, Task]),
    forwardRef(() => ProjectsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}