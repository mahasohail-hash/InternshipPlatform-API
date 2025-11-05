// src/tasks/tasks.controller.ts
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
import { TaskStatus } from '../projects/entities/task.entity';

// Secure controller using JWT and RolesGuard
@UseGuards(AuthGuard('jwt'), RolesGuard)
// CRITICAL FIX: Change to a specific base path.
// This resolves ambiguity with other controllers that use '/projects'.
// Tasks are usually under a project or milestone, so '/projects/tasks' makes sense.
@Controller('projects/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // --- CREATE TASK (Nested under Milestone) ---
  // POST /api/projects/tasks/milestones/:milestoneId/
  @Post('milestones/:milestoneId') // Adjusted path relative to 'projects/tasks' base
  @Roles(UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(createTaskDto, milestoneId);
  }

  // --- GET TASKS FOR MILESTONE ---
  // GET /api/projects/tasks/milestones/:milestoneId
  @Get('milestones/:milestoneId') // Adjusted path relative to 'projects/tasks' base
  @Roles(UserRole.MENTOR, UserRole.HR, UserRole.INTERN)
  findAllByMilestone(@Param('milestoneId', ParseUUIDPipe) milestoneId: string) {
    return this.tasksService.findAllByMilestone(milestoneId);
  }

  // --- GET SINGLE TASK ---
  // GET /api/projects/tasks/:id (This now directly maps to /api/projects/tasks/:id)
  @Get(':id') // Adjusted path relative to 'projects/tasks' base
  @Roles(UserRole.MENTOR, UserRole.HR, UserRole.INTERN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  // --- UPDATE TASK ---
  // PATCH /api/projects/tasks/:id
  @Patch(':id') // Adjusted path relative to 'projects/tasks' base
  @Roles(UserRole.MENTOR, UserRole.HR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    if (updateTaskDto.status) {
      throw new BadRequestException('Use the specific /status endpoint to update task status.');
    }
    return this.tasksService.update(id, updateTaskDto);
  }

  // --- UPDATE TASK STATUS (Specific endpoint for Kanban/Interns) ---
  // PATCH /api/projects/tasks/:id/status
  @Patch(':id/status') // Adjusted path relative to 'projects/tasks' base
  @Roles(UserRole.MENTOR, UserRole.HR, UserRole.INTERN)
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TaskStatus,
  ) {
    if (!status || !Object.values(TaskStatus).includes(status)) {
      throw new BadRequestException(`Invalid status value provided. Must be one of: ${Object.values(TaskStatus).join(', ')}`);
    }
    return this.tasksService.updateStatus(id, status);
  }

  // --- DELETE TASK ---
  // DELETE /api/projects/tasks/:id
  @Delete(':id') // Adjusted path relative to 'projects/tasks' base
  @Roles(UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tasksService.remove(id);
  }
}