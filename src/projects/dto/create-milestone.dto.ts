import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested, // Must be imported
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer'; // Must be imported
import { CreateTaskDto } from './create-task.dto'; // Import the corrected Task DTO

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsDateString({}, { message: 'Milestone due date must be a valid ISO 8601 date string.' })
  @IsOptional()
  dueDate?: string;




  // --- ENSURE THIS IS CORRECT ---
  // Validate the nested array of tasks
  @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateTaskDto)
    tasks?: CreateTaskDto[];
  
  
}