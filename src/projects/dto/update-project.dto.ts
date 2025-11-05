// src/projects/dto/update-project.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import { IsOptional, IsString, IsUUID, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMilestoneDto } from './create-milestone.dto'; 
export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  status: import("c:/Users/maha.sohail_ventured/Documents/Projects/internship-management/internship-platform-backend/src/projects/entities/project.entity").ProjectStatus | undefined;
}