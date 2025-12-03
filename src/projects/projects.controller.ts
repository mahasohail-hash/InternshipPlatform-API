import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
  UseGuards,
  UnauthorizedException,
  Post,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TaskStatus } from './entities/task.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectDetailsDto } from './dto/project-details.dto';

interface JwtPayloadUser {
  id: string;
  role: UserRole;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // --- Get all projects (HR & Mentor only) ---
  @Get()
  @Roles(UserRole.HR, UserRole.MENTOR)
  async findAllProjectsForHr(): Promise<ProjectDetailsDto[]> {
    return this.projectsService.findAllWithDetails();
  }

  // --- Get projects for the current mentor ---
  @Get('mentor')
  @Roles(UserRole.MENTOR)
  async getMentorProjects(@CurrentUser() user: JwtPayloadUser): Promise<ProjectDetailsDto[]> {
    if (!user?.id) throw new UnauthorizedException('Mentor ID missing from token.');
    return this.projectsService.getProjectsByMentor(user.id);
  }

  // --- Get tasks for a specific intern ---
  @Get('intern/:internId/tasks')
  @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
  async getTasksByIntern(@Param('internId', ParseUUIDPipe) internId: string) {
    return this.projectsService.getTasksForIntern(internId);
  }

  // --- Create a new project ---
  @Post()
  @Roles(UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: JwtPayloadUser) {
    if (!user?.id) throw new UnauthorizedException('User ID missing from token.');

    // Mentor ID logic: HR can specify, Mentor uses own ID
    const projectMentorId = user.role === UserRole.HR ? createProjectDto.mentorId : user.id;
    if (!projectMentorId) throw new BadRequestException('Mentor ID is required for project creation.');

    return this.projectsService.createProject(createProjectDto, projectMentorId);
  }

  // --- Get a single project ---
  @Get(':id')
  @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
  async findOneProject(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<ProjectDetailsDto> {
    if (!user?.id) throw new UnauthorizedException('Authentication required.');
    return this.projectsService.findOne(projectId, user.id, user.role);
  }

  // --- Update project details ---
  @Patch(':id')
  @Roles(UserRole.MENTOR, UserRole.HR)
  async updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    if (!user?.id) throw new UnauthorizedException('User ID missing from token.');
    return this.projectsService.updateProject(id, updateProjectDto, user.id, user.role);
  }

  // --- Update task status ---
  @Patch('tasks/:taskId/status')
  @Roles(UserRole.INTERN, UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  async updateTaskStatus(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body('status') status: TaskStatus,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    if (!user?.id) throw new UnauthorizedException('User not authenticated.');
    return this.projectsService.updateTaskStatus(taskId, status, user.id, user.role);
  }
}
