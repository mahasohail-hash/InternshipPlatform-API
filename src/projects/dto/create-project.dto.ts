import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMilestoneDto } from './create-milestone.dto';
import { ProjectStatus } from '../entities/project.entity'; // Import ProjectStatus

export class CreateProjectDto {
  @IsString({ message: 'Project title must be a string.' })
  @IsNotEmpty({ message: 'Project title should not be empty.' })
  title!: string;

  @IsString({ message: 'Project description must be a string.' })
  @IsOptional()
  description?: string;

  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
  @IsNotEmpty({ message: 'Intern assignment is required.' })
  internId!: string;

  // CRITICAL FIX: Add mentorId as optional for HR to specify, otherwise derive from token
  @IsUUID('4', { message: 'Mentor ID must be a valid UUID.' })
  @IsOptional()
  mentorId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  milestones?: CreateMilestoneDto[];

  @IsEnum(ProjectStatus, { message: 'Invalid project status.' })
  @IsOptional() // Allow setting initial status, or service defaults to PLANNING
  status?: ProjectStatus;
}