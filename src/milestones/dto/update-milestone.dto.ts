import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateMilestoneDto } from './create-milestone.dto';
import { IsArray, IsOptional, ValidateNested, IsUUID, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTaskDto } from '../../projects/dto/update-task.dto';

// Extend CreateMilestoneDto but make all properties optional.
// Redefine tasks to allow updates/deletions.
const BaseMilestoneUpdateDto = PartialType(
  OmitType(CreateMilestoneDto, ['tasks'] as const) // Omit tasks to redefine it
);

export class UpdateMilestoneDto extends BaseMilestoneUpdateDto {
  @IsUUID('4', { message: 'Milestone ID must be a valid UUID.' })
  @IsOptional()
  id?: string; // Optional for existing milestones

  @IsArray({ message: 'Tasks must be an array.' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateTaskDto) // Use UpdateTaskDto for nested task updates
  tasks?: UpdateTaskDto[];
}
