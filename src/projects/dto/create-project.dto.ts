import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested, // Must be imported
  IsUUID,
  // IsEnum, // If you add status later
} from 'class-validator';
import { Type } from 'class-transformer'; // Must be imported
import { CreateMilestoneDto } from './create-milestone.dto'; // Import the corrected Milestone DTO
// import { ProjectStatus } from '../entities/project.entity';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Assuming you assign ONE intern to the whole project during creation
  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
  @IsNotEmpty({ message: 'Intern assignment is required.' }) // Or IsOptional
  internId!: string;

  // --- ENSURE THIS IS CORRECT ---
  // Validate the nested array of milestones
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true }) // Validate each Milestone object
  @Type(() => CreateMilestoneDto) // Use CreateMilestoneDto for validation
  milestones?: CreateMilestoneDto[];
  // --------------------------

  // @IsEnum(ProjectStatus)
  // @IsOptional()
  // status?: ProjectStatus; // Service should likely set default status
}