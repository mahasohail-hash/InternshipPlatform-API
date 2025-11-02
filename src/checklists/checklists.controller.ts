import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  NotFoundException,
  BadRequestException,
   ParseUUIDPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';


@Controller('checklists')
//@UseGuards( RolesGuard)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}


  @Post('templates') 
  @Roles(UserRole.HR) 
  createTemplate(
    @Body() createChecklistTemplateDto: CreateChecklistTemplateDto,
  ) {
    return this.checklistsService.createTemplate(createChecklistTemplateDto);
  }

 
  @Get('templates')
  @Roles(UserRole.HR)
  findAllTemplates() {
    return this.checklistsService.findAllTemplates();
  }
  
  // ... (PATCH, DELETE for templates) ...
// Handles requests like PATCH /api/checklists/templates/your-template-id
  @Patch('templates/:id')
   @Roles(UserRole.HR)
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string, // Validate that 'id' is a UUID
    @Body() updateDto: UpdateChecklistTemplateDto,
  ) {
    return this.checklistsService.updateTemplate(id, updateDto);
  }
  // -----------------------------------------------------------

  // --- FIX: THIS METHOD WAS MISSING (Fixes "Delete not working") ---
  // Handles requests like DELETE /api/checklists/templates/your-template-id
@Delete('templates/:id')
  @Roles(UserRole.HR)
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string) { // Validate that 'id' is a UUID
    // Ensure the service returns void or confirmation
    return this.checklistsService.deleteTemplate(id);
  }

  // --- ADD THIS ENDPOINT (Fixes "Failed to load" error) ---
  // GET /api/checklists/intern/:internId
  @Get('intern/:internId')
  async getInternChecklist(@Param('internId') internId: string) {
    return this.checklistsService.findChecklistByInternId(internId);
  }

  // --- ADD THIS ENDPOINT (Fixes checkbox toggle) ---
  // PATCH /api/checklists/items/:itemId
  @Patch('items/:itemId')
  async updateItemStatus(
    @Param('itemId') itemId: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    if (typeof isCompleted !== 'boolean') {
      throw new BadRequestException('isCompleted must be a boolean');
    }
    return this.checklistsService.updateChecklistItemStatus(itemId, isCompleted);
  }
}
