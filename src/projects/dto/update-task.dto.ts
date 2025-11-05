import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto'; // Ensure this DTO is correctly typed
import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';


const BasePartialTaskDto = PartialType(
  OmitType(CreateTaskDto, [
'status',
 'assignedToInternId',
 ] as const),
);

export class UpdateTaskDto extends BasePartialTaskDto {
  @IsUUID('4', { message: 'Task ID must be a valid UUID.' })
  @IsOptional()
  id?: string;

  @IsEnum(TaskStatus, { message: 'Invalid task status.' })
  @IsOptional()
  status?: TaskStatus;

  @IsUUID('4', { message: 'Assigned intern ID must be a valid UUID or null for unassignment.' })
  @IsOptional()
  assignedToInternId?: string | null;

  

  @IsUUID('4', { message: 'Milestone ID must be a valid UUID if provided for reassignment.' })
  @IsOptional()
  milestoneId?: string;
  title: string | undefined;
  description: any;
dueDate?: string | null;

}