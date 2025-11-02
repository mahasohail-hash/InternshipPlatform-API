// src/users/users.module.ts
import { Module, forwardRef } from '@nestjs/common'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/users.entity';
import { AuthModule } from '../auth/auth.module'; 
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { InternChecklistItem } from '../checklists/entities/intern-checklist-item.entity';
import { Checklist } from '../checklists/entities/checklist.entity';
import { ChecklistItem } from '../checklists/entities/checklist-item.entity';
import { ChecklistsModule } from '../checklists/checklists.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
   //TypeOrmModule.forFeature([User]),
   TypeOrmModule.forFeature([
    User,
     Checklist,
     InternChecklist,
       ChecklistItem,     
     InternChecklistItem,]),
    forwardRef(() => ChecklistsModule),  // Safely import a module that might depend on UsersModule
    forwardRef(() => AuthModule),  
    forwardRef(() => ProjectsModule),
    ChecklistsModule,
  ],
 controllers: [UsersController],
  providers: [UsersService],
exports: [
        UsersService, 
        TypeOrmModule.forFeature([User]) // Explicitly export the User repository feature
    ],})
export class UsersModule {}