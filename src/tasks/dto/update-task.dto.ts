import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskStatus } from '../../projects/entities/task.entity'; // Ensure correct path

// Base DTO: inherits all optional fields from CreateTaskDto except fields we want to redefine
const BasePartialDto = PartialType(
  OmitType(CreateTaskDto, ['assignedToInternId', 'milestoneId'] as const),
);

export class UpdateTaskDto extends BasePartialDto {
  // --- Explicit Overrides & Validations ---

  // Status: optional, validated enum
  @IsEnum(TaskStatus, { message: 'Status must be a valid TaskStatus.' })
  @IsOptional()
  status?: TaskStatus;

  // Assignee: optional, allows null to unassign
  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID.' })
  @IsOptional()
  assignedToInternId?: string | null;

  // Milestone: optional, allows task to move between milestones
  @IsUUID('4', { message: 'Milestone ID must be a valid UUID.' })
  @IsOptional()
  milestoneId?: string;
}
