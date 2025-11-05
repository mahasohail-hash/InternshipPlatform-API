
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum, // Import IsEnum
} from 'class-validator';
import { TaskStatus } from '../entities/task.entity'; // CRITICAL FIX: Correct
export class CreateTaskDto {
@IsString({ message: 'Task title must be a string.' })
@IsNotEmpty({ message: 'Task title should not be empty.' })
title!: string;
@IsString({ message: 'Task description must be a string.' })
@IsOptional()
description?: string;
@IsDateString({}, { message: 'Due date must be a valid ISO 8601 date string.' })
    @IsOptional()
    dueDate?: string | null;// Frontend must send ISO format if provided
@IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
@IsOptional() // Task might be unassigned initially or assigned by project's intern
assignedToInternId?: string;
@IsEnum(TaskStatus, { message: 'Invalid task status.' })
@IsOptional() // Service will likely set default to TODO
status?: TaskStatus;
  id: any;
// milestoneId is typically set by the service when creating a task under a milestone
// @IsUUID('4', { message: 'Milestone ID must be a valid UUID.' })
// @IsOptional()
// milestoneId?: string;
}