import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum, // Import IsEnum
} from 'class-validator';
// --- FIX: Import TaskStatus from the Entity File ---
import { TaskStatus } from '../../projects/entities/task.entity'; // Adjust path based on where TaskStatus is defined/exported
// --- End Fix ---

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  // --- FIX: Use consistent name ---
  @IsUUID('4')
  @IsOptional()
  assignedToInternId?: string; // Renamed from assigneeId
  // ---

  // --- FIX: Added Status ---
  @IsEnum(TaskStatus)
  @IsOptional() // Service will likely set default to TODO
  status?: TaskStatus;
  // ---

  // --- FIX: Added Milestone ID back (as optional) ---
  @IsUUID('4')
  @IsOptional() // Make optional as it's set by the controller/service context
  milestoneId?: string;
  // ---
}