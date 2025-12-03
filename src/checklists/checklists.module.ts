import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';

import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistTemplateItem } from './entities/checklist-template-item.entity';
import { Checklist } from './entities/checklist.entity';
import { ChecklistItem } from './entities/checklist-item.entity';
import { InternChecklist } from './entities/intern-checklist.entity';
import { InternChecklistItem } from './entities/intern-checklist-item.entity';

// dependent modules (forwardRef to avoid circular dependencies)
import { UsersModule } from '@/users/users.module';
import { InternModule } from '@/interns/intern.module';
import { Intern } from '../interns/entities/intern.entity';
import { User } from '../users/entities/users.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChecklistTemplate,
      ChecklistTemplateItem,
      Checklist,
      ChecklistItem,
      InternChecklist,
      InternChecklistItem,
       User,
      Intern,
    ]),
    forwardRef(() => InternModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
  exports: [ChecklistsService, TypeOrmModule],
})
export class ChecklistsModule {}
