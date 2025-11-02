// src/projects/projects.controller.ts
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
  Req,
  Request,
  NotFoundException
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator'; 
import { TaskStatus } from './entities/task.entity';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectDto } from '../projects/dto/create-project.dto';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { get } from 'http';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface JwtPayloadUser { id: string; role: UserRole; }

@Controller('projects')

//@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

@Get()
  @Roles(UserRole.HR, UserRole.MENTOR) // <-- MAKE SURE UserRole.HR IS HERE
  findAll() {
    return this.projectsService.findAll();
  }
// 3. GET /projects/mentor - Mentor sees their list of projects
  @Get('mentor')
  @Roles(UserRole.MENTOR)
  async getMentorProjects(
   @CurrentUser() user: JwtPayloadUser) {
    // 🔥 DEEP DEBUG: Log the user object to see exactly what the token provides
    console.log('[DEBUG-PROJECTS] User payload:', user);
    if (!user || !user.id) {
        // If no user ID is present, the authentication pipeline failed.
        // Note: This should ideally be caught by the JwtAuthGuard, but this prevents the 500 error.
        throw new UnauthorizedException('Mentor ID could not be retrieved from the token.');
  return [];
  
      }


    const mentorId = user.id;
    // 🔥 DEEP DEBUG: Log the actual ID used for the service call
    console.log('[DEBUG-PROJECTS] Mentor ID used:', mentorId);
    const projects = await this.projectsService.getProjectsByMentor(mentorId);
return this.projectsService.getProjectsByMentor(mentorId);  }

  // 1. GET /projects/intern/:internId/tasks - Intern/Mentor/HR View
  @Get('intern/:internId/tasks')
  @Roles(UserRole.INTERN, UserRole.MENTOR, UserRole.HR)
  getInternTasks(@Param('internId') internId: string, @Req() req: RequestWithUser) {
    const user = req.user;

    // FIX: Convert user.id to string for strict comparison
    if (user.role === UserRole.INTERN && String(user.id) !== internId) {
      throw new UnauthorizedException('You can only view your own tasks.');
    }

    return this.projectsService.getTasksForIntern(internId);
  }

  // 2. POST /projects - Mentor/HR creates a project
  @Post()
  @Roles(UserRole.MENTOR, UserRole.HR)
  createProject(@Body() createProjectDto: CreateProjectDto, @Req() req: RequestWithUser) {
    // FIX: Convert mentorId to string
    const mentorId = String(req.user.id);
    return this.projectsService.createProject(createProjectDto, mentorId);
  }

 @Get(':id') 
//@Roles(UserRole.HR, UserRole.MENTOR) 
async findOneProject(
 @Param('id', ParseUUIDPipe) projectId: string, 
 @CurrentUser() user: JwtPayloadUser | null
) {
    const userId = user?.id; 
    if (!userId) {
        
        throw new UnauthorizedException('Authentication required to view project details.');
    }
    console.log(`[ProjectsController] findOneProject called for projectId: ${projectId} by userId: ${userId}`);
    
    // The service layer should handle fetching, authorization, and 404/403 errors.
    // The previous 500 error was likely caused by logic inside the service or DTO mapping.
    
    try {
 return await this.projectsService.findOne(projectId, userId, [
'mentor', 
 'intern', 
 'interns', 
 'milestones', 
 'milestones.tasks', 
 'milestones.tasks.assignee' 
 ]);

    } catch (error) {
 console.error(`[ProjectsController] Error fetching project ${projectId}:`, error);

 throw error;
 }
}

@Get() // Handles GET /api/projects
@UseGuards(JwtAuthGuard, RolesGuard) // Protect route
@Roles(UserRole.HR, UserRole.MENTOR) // Allow HR and Mentor access
async findAllProjectsForHr() {
    console.log('[ProjectsController] findAllProjectsForHr called'); // Add log
    try {
        // Call the service method to get all projects with relations
        return await this.projectsService.findAllWithDetails(); 
    } catch (error) {
        console.error('[ProjectsController] Error in findAllProjectsForHr:', error);
        throw error; // Re-throw to let NestJS handle standard errors (like 500)
    }
}




  


  
  // --- NEW ROUTE FOR EDIT PAGE (UPDATE) ---
  @Patch(':id')
  @Roles(UserRole.MENTOR, UserRole.HR)
  updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: CreateProjectDto, // Reuse DTO
    @Req() req: RequestWithUser,
  ) {
    // FIX: Convert mentorId to string
    const mentorId = String(req.user.id);
    return this.projectsService.updateProject(id, updateProjectDto, mentorId);
  }

  // 4. PATCH /projects/tasks/:taskId/status - Intern Updates Task Status
  @Patch('tasks/:taskId/status')
  @Roles(UserRole.INTERN)
  updateTaskStatus(
    @Param('taskId') taskId: string,
    @Body('status') status: TaskStatus,
    @Req() req: RequestWithUser , 
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated.');
    }

    // FIX: Convert user.id to string
    return this.projectsService.updateTaskStatus(taskId, status, String(req.user.id));
  }
}