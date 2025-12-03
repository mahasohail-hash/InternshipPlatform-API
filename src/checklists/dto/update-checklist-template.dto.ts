import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateChecklistTemplateItemDto } from './update-checklist-template-item.dto';

export class UpdateChecklistTemplateDto {
  @IsOptional()
  @IsString()
  name?: string; // Optional name update

  @IsOptional()
  @IsString()
  description?: string; // Optional description update

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateChecklistTemplateItemDto)
  items?: UpdateChecklistTemplateItemDto[]; // Optional nested template items update
}
