// src/milestones/dto/create-milestone.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsNotEmpty()
  projectId!: string;
}