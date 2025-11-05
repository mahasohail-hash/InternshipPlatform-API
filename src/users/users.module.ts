import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
// --- Entities ---
import { User } from './entities/users.entity';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity'; // CRITICAL FIX: Import InternChecklist
import { InternChecklistItem } from '../checklists/entities/intern-checklist-item.entity'; // CRITICAL FIX: Import InternChecklistItem
// --- Modules ---
import { AuthModule } from '../auth/auth.module';
import { ChecklistsModule } from '../checklists/checklists.module'; // CRITICAL FIX: Import ChecklistsModule
import { ProjectsModule } from '../projects/projects.module'; // CRITICAL FIX: Import ProjectsModule

@Module({
  imports: [
   // CRITICAL FIX: Ensure all entities directly used by UsersService are provided here
   TypeOrmModule.forFeature([
    User,
    InternChecklist,
    InternChecklistItem,
   ]),
    forwardRef(() => ChecklistsModule),  // Use forwardRef for potential circular dependency
    forwardRef(() => AuthModule),  // Use forwardRef
    forwardRef(() => ProjectsModule), // Use forwardRef
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [
        UsersService,
        TypeOrmModule.forFeature([User]) // CRITICAL FIX: Explicitly export the User repository feature
    ],
})
export class UsersModule {}