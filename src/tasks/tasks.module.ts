import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from '../projects/entities/task.entity';
import { Milestone } from '../projects/entities/milestone.entity'; // Adjust path if needed
// --- FIX 1: Correct Import Path for User Entity ---
import { User } from '../users/entities/users.entity'; // Changed from 'users.entity'
// --- End Fix ---
// --- FIX 2: Import UsersModule as a dependency ---
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Milestone,
      User // Registering User is required for injection in the service/controller if used as a provider
    ]),
    UsersModule // <-- CRITICAL FIX: Provides UsersService dependency (for findOneByEmail, etc.)
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService], // Export service for other modules (like ProjectsModule)
})
export class TasksModule {}