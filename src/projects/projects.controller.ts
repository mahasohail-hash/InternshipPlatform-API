import {
  Controller, Get, Param, ParseUUIDPipe, Patch, Body, UseGuards, UnauthorizedException, Post, Req, NotFoundException, InternalServerErrorException, ForbiddenException, HttpCode, HttpStatus, Query, BadRequestException
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator'; 
import { TaskStatus } from './entities/task.entity';
import { CreateProjectDto } from '../projects/dto/create-project.dto'; // Ensure this DTO is correct
import { UpdateProjectDto } from '../projects/dto/update-project.dto';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ProjectDetailsDto } from './dto/project-details.dto';
import { Public } from '../auth/decorators/public.decorator'; // CRITICAL FIX: Standard import for Public

interface JwtPayloadUser { id: string; role: UserRole; }

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles(UserRole.HR, UserRole.MENTOR)
  async findAllProjectsForHr(): Promise<ProjectDetailsDto[]> {
    try {
        return await this.projectsService.findAllWithDetails();
    } catch (error) {
        console.error('[ProjectsController] Error in findAllProjectsForHr:', error);
        throw new InternalServerErrorException('Failed to retrieve all projects.');
    }
  }

  @Get('mentor')
  @Roles(UserRole.MENTOR)
  async getMentorProjects(@CurrentUser() user: JwtPayloadUser): Promise<ProjectDetailsDto[]> {
    if (!user || !user.id) {
        throw new UnauthorizedException('Mentor ID could not be retrieved from the token.');
    }
    return this.projectsService.getProjectsByMentor(user.id);
  }

  @Get('intern/:internId/tasks') // Full path: /api/projects/intern/:internId/tasks
   @Public()
  
  //@Roles(UserRole.INTERN, UserRole.MENTOR, UserRole.HR)
 async getInternTasks(@Param('internId', ParseUUIDPipe) internId: string, @CurrentUser() user?: JwtPayloadUser) {   
   
    return this.projectsService.getTasksForIntern(internId);
  }
  @Post()
  @Roles(UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: JwtPayloadUser) {
    if (!user || !user.id) {
        throw new UnauthorizedException('User ID could not be retrieved from the token.');
    }
    // CRITICAL FIX: mentorId needs to be an optional property on CreateProjectDto if HR can specify it.
    // If HR creates, they should be able to specify the mentorId in the DTO.
    // If a Mentor creates, their own ID is the mentorId.
    const projectMentorId = user.role === UserRole.HR ? createProjectDto.mentorId : user.id;

    if (!projectMentorId) throw new BadRequestException('Mentor ID is required for project creation.');

    return this.projectsService.createProject(createProjectDto, projectMentorId);
  }

  @Get(':id')
  @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
  async findOneProject(@Param('id', ParseUUIDPipe) projectId: string, @CurrentUser() user: JwtPayloadUser): Promise<ProjectDetailsDto> {
    if (!user || !user.id) {
        throw new UnauthorizedException('Authentication required to view project details.');
    }
    return await this.projectsService.findOne(projectId, user.id, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.MENTOR, UserRole.HR)
  async updateProject(@Param('id', ParseUUIDPipe) id: string, @Body() updateProjectDto: UpdateProjectDto, @CurrentUser() user: JwtPayloadUser) {
    if (!user || !user.id) {
        throw new UnauthorizedException('User ID could not be retrieved from the token.');
    }
    return this.projectsService.updateProject(id, updateProjectDto, user.id, user.role);
  }

  @Patch('tasks/:taskId/status')
  @Roles(UserRole.INTERN, UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  async updateTaskStatus(@Param('taskId', ParseUUIDPipe) taskId: string, @Body('status') status: TaskStatus, @CurrentUser() user: JwtPayloadUser) {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated.');
    }
    return this.projectsService.updateTaskStatus(taskId, status, user.id, user.role);
  }
}