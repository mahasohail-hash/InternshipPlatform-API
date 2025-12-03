import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from '../projects/entities/task.entity';
import { Milestone } from '../projects/entities/milestone.entity';
import { User } from '../users/entities/users.entity';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module'; // Optional, if you need cross-module injection

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Milestone, User]),
    forwardRef(() => UsersModule),
    forwardRef(() => ProjectsModule), // Optional: for milestone/project cross-relations
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService], // Exported for injection into other modules like ProjectsModule
})
export class TasksModule {}
