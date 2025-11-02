import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { TaskStatus } from '../projects/entities/task.entity'; // Ensure TaskStatus is imported from its entity file

// Secure controller using JWT and RolesGuard
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller() // Using root controller for explicit path definition
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // --- CREATE TASK (Nested under Milestone) ---
  // POST /api/projects/milestones/:milestoneId/tasks
  @Post('projects/milestones/:milestoneId/tasks')
  @Roles(UserRole.MENTOR, UserRole.HR) // Only Mentors/HR can create tasks
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string, // Get milestoneId from URL
    @Body() createTaskDto: CreateTaskDto,
  ) {
    // Pass the milestoneId from the URL to the service
    return this.tasksService.create(createTaskDto, milestoneId);
  }

  // --- GET TASKS FOR MILESTONE ---
  // GET /api/projects/milestones/:milestoneId/tasks
  @Get('projects/milestones/:milestoneId/tasks')
  @Roles(UserRole.MENTOR, UserRole.HR, UserRole.INTERN) // Allow Interns to view tasks
  findAllByMilestone(@Param('milestoneId', ParseUUIDPipe) milestoneId: string) {
    return this.tasksService.findAllByMilestone(milestoneId);
  }

  // --- GET SINGLE TASK ---
  // GET /api/projects/tasks/:id
  @Get('projects/tasks/:id')
  @Roles(UserRole.MENTOR, UserRole.HR, UserRole.INTERN) // Allow Interns to view task details
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  // --- UPDATE TASK ---
  // PATCH /api/projects/tasks/:id
  @Patch('projects/tasks/:id')
  @Roles(UserRole.MENTOR, UserRole.HR) // Only Mentors/HR can edit tasks generally
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    // Prevent status updates via this generic endpoint if /status endpoint exists
    if (updateTaskDto.status) {
      throw new BadRequestException('Use the specific /status endpoint to update task status.');
    }
    return this.tasksService.update(id, updateTaskDto);
  }

  // --- UPDATE TASK STATUS (Specific endpoint for Kanban/Interns) ---
  // PATCH /api/projects/tasks/:id/status
  @Patch('projects/tasks/:id/status')
  @Roles(UserRole.MENTOR, UserRole.HR, UserRole.INTERN) // Allow Interns to update status
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TaskStatus, // Expect body like { "status": "In Progress" }
  ) {
    // Add validation for the status value
    if (!status || !Object.values(TaskStatus).includes(status)) {
      throw new BadRequestException(`Invalid status value provided. Must be one of: ${Object.values(TaskStatus).join(', ')}`);
    }
    return this.tasksService.updateStatus(id, status);
  }

  // --- DELETE TASK ---
  // DELETE /api/projects/tasks/:id
  @Delete('projects/tasks/:id')
  @Roles(UserRole.MENTOR, UserRole.HR) // Only Mentors/HR can delete
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tasksService.remove(id);
  }
}