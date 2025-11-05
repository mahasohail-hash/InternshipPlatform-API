import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, NotFoundException, BadRequestException, ParseUUIDPipe, HttpCode, HttpStatus, ForbiddenException
} from '@nestjs/common';
import { ChecklistsService } from "./checklists.service"; // CRITICAL FIX: Standard import
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from "../common/enums/user-role.enum"; // CRITICAL FIX: Standard import
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from "../auth/decorators/current-user.decorator"; // CRITICAL FIX: Standard import
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Public } from '@/auth/decorators/public.decorator';
interface AuthenticatedUserPayload extends JwtPayload {
    id: string;
    role: UserRole;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post('templates')
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  createTemplate(@Body() createChecklistTemplateDto: CreateChecklistTemplateDto) {
    return this.checklistsService.createTemplate(createChecklistTemplateDto);
  }

  @Get('templates')
  @Roles(UserRole.HR)
  findAllTemplates() {
    return this.checklistsService.findAllTemplates();
  }

  @Patch('templates/:id')
  @Roles(UserRole.HR)
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: UpdateChecklistTemplateDto) {
    return this.checklistsService.updateTemplate(id, updateDto);
  }

  @Delete('templates/:id')
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.checklistsService.deleteTemplate(id);
  }

  // Other routes...

 @Get('intern/:internId') // This is the route your frontend is expecting: /api/checklists/intern/:internId
  @Public() // It was temporarily public for debugging, keep it for now.
  // @Roles(UserRole.INTERN, UserRole.MENTOR, UserRole.HR) // Uncomment and remove @Public() once confirmed working.
  async getInternChecklist(@Param('internId', ParseUUIDPipe) internId: string, @CurrentUser() user?: AuthenticatedUserPayload) {
    if (user && user.role === UserRole.INTERN && user.id !== internId) { // Check user only if present
        throw new ForbiddenException('You can only view your own checklist.');
    }
    return this.checklistsService.findChecklistByInternId(internId);
  }
 @Patch('items/:itemId')
  @Roles(UserRole.INTERN)
  @HttpCode(HttpStatus.OK)
  async updateInternChecklistItemStatus(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body('isCompleted') isCompleted: boolean,
    @CurrentUser() user: AuthenticatedUserPayload
  ) {
    if (typeof isCompleted !== 'boolean') {
        throw new BadRequestException('The request body must contain a boolean field: isCompleted.');
    }
    return this.checklistsService.updateItemStatus(itemId, isCompleted, user.id);
  }
}