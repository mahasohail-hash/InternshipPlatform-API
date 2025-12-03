import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// --- Services & Controllers ---
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

// --- Entities ---
import { User } from './entities/users.entity';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { InternChecklistItem } from '../checklists/entities/intern-checklist-item.entity';

// --- Modules ---
import { AuthModule } from '../auth/auth.module';
import { ChecklistsModule } from '../checklists/checklists.module';
import { ProjectsModule } from '../projects/projects.module';
import { InternModule } from '../interns/intern.module';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [
    // Entities required by UsersService
    TypeOrmModule.forFeature([
      User,
      InternChecklist,
      InternChecklistItem,
    ]),

    // Other modules with potential circular dependencies
    forwardRef(() => AuthModule),
    forwardRef(() => ChecklistsModule),
    forwardRef(() => ProjectsModule),
    forwardRef(() => InternModule),
    forwardRef(() => GithubModule),
  ],

  controllers: [
    UsersController, // Keep only relevant controllers for this module
  ],

  providers: [
    UsersService,
  ],

  exports: [
    UsersService, // Export UsersService for other modules
    TypeOrmModule.forFeature([User]), // Export User repository
  ],
})
export class UsersModule {}
