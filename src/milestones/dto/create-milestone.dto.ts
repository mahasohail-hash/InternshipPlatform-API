import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
// CRITICAL FIX: Correct the import path to be relative or use an alias like '@projects/dto/create-task.dto'
import { CreateTaskDto } from '../../projects/dto/create-task.dto';

export class CreateMilestoneDto {
  @IsString({ message: 'Milestone title must be a string.' })
  @IsNotEmpty({ message: 'Milestone title should not be empty.' })
  title!: string;

  @IsString({ message: 'Milestone description must be a string.' })
  @IsOptional()
  description?: string;

  @IsDateString({}, { message: 'Milestone due date must be a valid ISO 8601 date string.' })
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskDto)
  tasks?: CreateTaskDto[];
}