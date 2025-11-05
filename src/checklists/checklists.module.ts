// src/checklists/checklists.module.ts
import { Module,forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';

// --- FIX: Import from the ./entities subfolder ---
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistTemplateItem } from './entities/checklist-template-item.entity';
import { InternChecklist } from './entities/intern-checklist.entity';
import { InternChecklistItem } from './entities/intern-checklist-item.entity';
import { Checklist } from './entities/checklist.entity'; 
import { ChecklistItem } from './entities/checklist-item.entity';
import { EntityManager } from 'typeorm';
@Module({
 imports: [
TypeOrmModule.forFeature([
ChecklistTemplate,
 ChecklistTemplateItem,
InternChecklist,
 InternChecklistItem,
 Checklist,
 ChecklistItem,
]),
 ],
 controllers: [ChecklistsController],
 providers: [ChecklistsService, EntityManager,],
 exports: [ChecklistsService, TypeOrmModule], // <-- Also export service
})
export class ChecklistsModule {}