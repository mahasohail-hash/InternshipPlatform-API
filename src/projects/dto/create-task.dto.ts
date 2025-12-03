import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @IsString({ message: 'Task title must be a string.' })
  @IsNotEmpty({ message: 'Task title should not be empty.' })
  title!: string;

  @IsOptional()
  @IsString({ message: 'Task description must be a string.' })
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO 8601 date string.' })
  dueDate?: string | null; // Frontend should send ISO format if provided

  // Optional assignment to an intern
  @IsOptional()
  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
  assignedToInternId?: string;

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Invalid task status.' })
  status?: TaskStatus;

  // Optional ID (used internally or for updates)
  @IsOptional()
  @IsUUID('4', { message: 'Task ID must be a valid UUID.' })
  id?: string;

  // milestoneId will be set automatically by the service when creating a task under a milestone
}
