import { IsString, IsOptional, ValidateNested, ArrayMinSize, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateChecklistTemplateItemDto } from './create-checklist-template-item.dto';

export class CreateChecklistTemplateDto {
  @IsString()
  name!: string; // Name of the checklist template

  @IsOptional()
  @IsString()
  description?: string; // Optional description of the template

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistTemplateItemDto)
  items!: CreateChecklistTemplateItemDto[]; // At least one item required in the template
}
