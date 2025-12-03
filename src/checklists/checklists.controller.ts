// src/checklists/checklists.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  Req,
  Delete,
} from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { AssignMultipleDto } from './dto/assign-multiple.dto';
import { UpdateChecklistItemStatusDto } from './dto/update-checklist-item-status.dto';
import { AssignChecklistsDto } from './dto/assign-checklist.dto';

@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly svc: ChecklistsService) {}

  /** ---------------- Templates ---------------- */
  @Get('templates')
  getTemplates() {
    return this.svc.findAllTemplates();
  }

  @Post('templates')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createTemplate(@Body() dto: CreateChecklistTemplateDto) {
    return this.svc.createTemplate(dto);
  }

  @Get('templates/:id')
  getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findTemplateById(id);
  }

  @Patch('templates/:id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChecklistTemplateDto) {
    return this.svc.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string, @Query('force') force?: string) {
    return this.svc.deleteTemplate(id, { force: force === 'true' });
  }

  /** ---------------- Assign Templates ---------------- */
  @Post('templates/assign')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  assignMultiple(@Body() dto: AssignMultipleDto) {
    return this.svc.assignTemplatesToInterns(dto.templateIds, dto.internIds);
  }

  /** ---------------- Intern-specific ---------------- */
  @Get('intern/:internId')
  getForIntern(@Param('internId', ParseUUIDPipe) internId: string) {
    return this.svc.getChecklistsForIntern(internId);
  }

  /** ---------------- Checklist Items ---------------- */
  @Patch('items/:itemId/status')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateItemStatus(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateChecklistItemStatusDto,
    @Req() req: any,
  ) {
    // resolve actor intern id from request (e.g., via auth guard)
    const actorInternId = req?.user?.internId ?? req?.user?.id;
    return this.svc.updateItemStatus(itemId, dto.isCompleted, actorInternId);
  }

  /** ---------------- All Checklists ---------------- */
  @Get()
  listAll() {
    return this.svc.findAllChecklists();
  }

  @Get(':id')
  getChecklist(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findChecklistById(id);
  }
}
