import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { forwardRef } from '@nestjs/common';
import { Project } from './entities/project.entity';
import { Milestone } from './entities/milestone.entity';
import { Task } from './entities/task.entity'; // <-- THIS IS THE CRITICAL FIX

import { UsersModule } from '../users/users.module'; 

@Module({
  imports: [
   
forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([Project, Milestone, Task]), 
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}