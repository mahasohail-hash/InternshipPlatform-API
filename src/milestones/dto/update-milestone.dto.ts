// src/milestones/dto/update-milestone.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateMilestoneDto } from './create-milestone.dto';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}