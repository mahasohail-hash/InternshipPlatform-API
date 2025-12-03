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
import { ProjectStatus } from '../entities/project.entity';

export class CreateProjectDto {
  @IsString({ message: 'Project title must be a string.' })
  @IsNotEmpty({ message: 'Project title should not be empty.' })
  title!: string;

  @IsOptional()
  @IsString({ message: 'Project description must be a string.' })
  description?: string;

  // Assign a main intern for the project
  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
  @IsNotEmpty({ message: 'Intern assignment is required.' })
  internId!: string;

  // Optional mentor assignment
  @IsOptional()
  @IsUUID('4', { message: 'Mentor ID must be a valid UUID.' })
  mentorId?: string;

  // Nested milestones for project creation
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  milestones?: CreateMilestoneDto[];

  // Optional project status (default will be PLANNING)
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'Invalid project status.' })
  status?: ProjectStatus;
}
