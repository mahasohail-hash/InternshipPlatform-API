import { PartialType, OmitType } from '@nestjs/mapped-types'; // Keep this for now
import { CreateTaskDto } from './create-task.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
// --- FIX: Correct import path for TaskStatus Enum ---
// Assuming TaskStatus is defined in the Task entity file:
import { TaskStatus } from '../../projects/entities/task.entity'; 
// --- End Fix ---

// Define the base DTO that includes all fields except the one we want to exclude/omit.
const BasePartialDto = PartialType(
  // Omit the fields that should not be changed via the base DTO update mechanism.
  // We omit assignedToInternId so we can redeclare it below to accept 'null'.
  OmitType(CreateTaskDto, [
      'assignedToInternId', 
      'milestoneId' // Omit if you want to handle milestoneId separately/explicitly
    ] as const),
);

// UpdateTaskDto inherits optional properties from CreateTaskDto
export class UpdateTaskDto extends BasePartialDto {
  // --- Overrides and Explicit Fields ---

  // 1. Status: Explicitly redefined here to ensure proper validation
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  // 2. Assignee: Redefine the assignee ID to allow 'null' for unassigning
  @IsUUID('4')
  @IsOptional()
  assignedToInternId?: string | null; // Allow null to unassign

  // 3. Milestone Change: Explicitly added back as optional UUID for moving tasks
  @IsUUID('4')
  @IsOptional()
  milestoneId?: string;
}