import { IsArray, ArrayNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class AssignChecklistsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  internIds!: string[]; // List of intern IDs to assign checklists to

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  checklistIds?: string[]; // Optional list of specific checklist instances

  @IsOptional()
  @IsUUID('4')
  templateId?: string; // Optional single template ID to create and assign checklists from
}
