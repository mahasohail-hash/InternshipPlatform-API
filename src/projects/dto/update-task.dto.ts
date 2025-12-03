// src/projects/dto/update-task.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsEnum, IsOptional, IsUUID, IsString, IsDateString } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

// Create a base partial DTO excluding 'status' and 'assignedToInternId'
const BasePartialTaskDto = PartialType(
  OmitType(CreateTaskDto, ['status', 'assignedToInternId'] as const),
);

export class UpdateTaskDto extends BasePartialTaskDto {
  @IsUUID('4', { message: 'Task ID must be a valid UUID.' })
  @IsOptional()
  id?: string;

  @IsEnum(TaskStatus, { message: 'Invalid task status.' })
  @IsOptional()
  status?: TaskStatus;

  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID or null for unassignment.' })
  @IsOptional()
  assignedToInternId?: string | null;

  @IsUUID('4', { message: 'Milestone ID must be a valid UUID if provided for reassignment.' })
  @IsOptional()
  milestoneId?: string;

  @IsString({ message: 'Task title must be a string.' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'Task description must be a string.' })
  @IsOptional()
  description?: string;

  @IsDateString({}, { message: 'Due date must be a valid ISO 8601 date string.' })
  @IsOptional()
  dueDate?: string | null;
}
