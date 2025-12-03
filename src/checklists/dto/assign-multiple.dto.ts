import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class AssignMultipleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  templateIds!: string[]; // List of checklist template IDs to assign

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  internIds!: string[]; // List of intern IDs to assign the templates to
}
