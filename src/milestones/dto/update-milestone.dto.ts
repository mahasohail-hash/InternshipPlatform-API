import { PartialType, OmitType } from '@nestjs/mapped-types'; // CRITICAL FIX: Import OmitType
import { CreateMilestoneDto } from './create-milestone.dto';
import { IsArray, IsOptional, ValidateNested, IsUUID, IsString } from 'class-validator'; // Add IsString
import { Type } from 'class-transformer';
import { UpdateTaskDto } from '../../projects/dto/update-task.dto'; // CRITICAL FIX: Import UpdateTaskDto

// Extend CreateMilestoneDto but make all properties optional.
// We also need to explicitly handle tasks to allow updates/deletions.
const BaseMilestoneUpdateDto = PartialType(
  OmitType(CreateMilestoneDto, ['tasks'] as const) // Omit tasks to redefine it
);

export class UpdateMilestoneDto extends BaseMilestoneUpdateDto {
  @IsString({ message: 'Milestone ID must be a string UUID if provided.' })
  @IsOptional()
  id?: string; // Allow ID to be present for existing milestones

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTaskDto) // CRITICAL FIX: Use UpdateTaskDto for nested tasks
  tasks?: UpdateTaskDto[];
}