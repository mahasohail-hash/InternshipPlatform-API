import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested, // <-- Must import
} from 'class-validator';
import { Type } from 'class-transformer'; 
//import { CreateChecklistTemplateItemDto } from '../../checklists/dto/create-checklist-template-item.dto'; // <-- Must import the ITEM DTO

export class CreateChecklistTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
 text?: string;

  // --- THIS IS THE FIX ---
  // This tells NestJS to validate the nested array of items
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistTemplateItemDto)
  items?: CreateChecklistTemplateItemDto[];
  
}
