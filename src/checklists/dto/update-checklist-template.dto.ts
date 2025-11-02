import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
// This import path seems correct relative to this file's location
import { CreateChecklistTemplateItemDto } from './create-checklist-template-item.dto';

// We create a new DTO for updating an item, which includes its 'id'
class UpdateChecklistTemplateItemDto extends CreateChecklistTemplateItemDto {
  @IsUUID()
  @IsOptional()
  id?: string; // 'id' is optional (for new items) but validated if present
}

// FIX: Corrected typo in the class name here
export class UpdateChecklistTemplateDto { 
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  // We use the new Update DTO that includes the 'id'
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateChecklistTemplateItemDto)
  items?: UpdateChecklistTemplateItemDto[];
}

