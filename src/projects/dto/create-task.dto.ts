import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateTaskDto {
  @IsString({ message: 'Task title must be a string.' })
  @IsNotEmpty({ message: 'Task title should not be empty.' })
  title!: string;

  @IsString({ message: 'Task description must be a string.' })
  @IsOptional()
  description?: string;

  @IsDateString({}, { message: 'Due date must be a valid ISO 8601 date string.' })
  @IsOptional()
  dueDate?: string; // Frontend must send ISO format if provided

  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
  @IsOptional() // Task might be unassigned initially
  assignedToInternId?: string;

  // Milestone ID removed - Service should handle linking
}