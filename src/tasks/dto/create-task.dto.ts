import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { TaskStatus } from '../../projects/entities/task.entity'; // Ensure correct path

export class CreateTaskDto {
  @IsString({ message: 'Task title must be a string.' })
  @IsNotEmpty({ message: 'Task title is required.' })
  title!: string;

  @IsString({ message: 'Task description must be a string.' })
  @IsOptional()
  description?: string;

  @IsDateString({}, { message: 'Due date must be a valid ISO 8601 date string.' })
  @IsOptional()
  dueDate?: string;

  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
  @IsOptional()
  assignedToInternId?: string;

  @IsEnum(TaskStatus, { message: 'Status must be a valid TaskStatus.' })
  @IsOptional() // Default will be set in service if not provided
  status?: TaskStatus;

  @IsUUID('4', { message: 'Milestone ID must be a valid UUID.' })
  @IsOptional() // Set by controller/service context
  milestoneId?: string;
}
