import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InternService } from './intern.service';
import { ChecklistsService } from '@/checklists/checklists.service';
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';
import { AssignChecklistsDto } from './dto/assign-checklists.dto';
import { RemoveChecklistDto } from './dto/remove-checklist.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';

interface AuthRequest extends Express.Request {
  user?: { id: string; role: UserRole; internId?: string };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('interns')
export class InternController {
  constructor(
    private readonly internService: InternService,
    private readonly checklistsService: ChecklistsService,
  ) {}

  // Create a new intern (HR only)
  @Post()
  @Roles(UserRole.HR)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createIntern(@Body() createInternDto: CreateInternDto) {
    return this.internService.createIntern(createInternDto);
  }

  // Get all interns (HR only)
  @Get()
  @Roles(UserRole.HR)
  async getAllInterns() {
    return this.internService.getAllInterns();
  }

  // Get a specific intern by ID (HR only)
  @Get(':id')
  @Roles(UserRole.HR)
  async getInternById(@Param('id', ParseUUIDPipe) id: string) {
    return this.internService.getInternById(id);
  }

  // Update an intern (HR only)
  @Patch(':id')
  @Roles(UserRole.HR)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateIntern(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInternDto: UpdateInternDto,
  ) {
    return this.internService.updateIntern(id, updateInternDto);
  }

  // Assign checklists to interns (HR only)
  @Post('assign-checklists')
  @Roles(UserRole.HR)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async assignChecklists(@Body() assignChecklistsDto: AssignChecklistsDto) {
    return this.internService.assignChecklists(assignChecklistsDto);
  }

  // Remove a checklist from an intern (HR only)
  @Patch(':internId/remove-checklist')
  @Roles(UserRole.HR)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async removeChecklist(
    @Param('internId', ParseUUIDPipe) internId: string,
    @Body() removeChecklistDto: RemoveChecklistDto,
  ) {
    return this.internService.removeChecklist(internId, removeChecklistDto.checklistId);
  }

  // Get logged-in intern's checklists
  @Get('me/checklists')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async getMyChecklists(@Req() req: AuthRequest) {
    if (!req.user) throw new ForbiddenException('Not authenticated');
    return this.internService.getMyChecklists(req.user.id);
  }

  // Get checklists of a specific intern (HR only)
  @Get(':internId/checklists')
  @Roles(UserRole.HR)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async getChecklistsByIntern(@Param('internId', ParseUUIDPipe) internId: string) {
    return this.internService.getChecklistsByIntern(internId);
  }

  // Update a checklist item status (Intern or HR)
  @Patch('items/:itemId/status')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateItemStatus(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: { isCompleted: boolean },
    @Req() req: AuthRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Not authenticated');
    return this.internService.updateItemStatus(itemId, body.isCompleted, req.user.id);
  }

  // Get GitHub status of a specific intern (HR or the intern themselves)
  @Get(':internId/github-status')
  @Roles(UserRole.HR, UserRole.INTERN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async getGithubStatus(
    @Param('internId', ParseUUIDPipe) internId: string,
    @Req() req: AuthRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Not authenticated');
    return this.internService.getGithubStatus(internId, req.user);
  }

  // Update GitHub username (HR or the intern themselves)
  @Patch(':internId/github')
  @Roles(UserRole.HR, UserRole.INTERN)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateGithubUsername(
    @Param('internId', ParseUUIDPipe) internId: string,
    @Body() body: { githubUsername: string },
    @Req() req: AuthRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Not authenticated');
    return this.internService.updateGithubUsername(internId, body.githubUsername, req.user);
  }
}
