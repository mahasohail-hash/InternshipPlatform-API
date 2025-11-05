// src/checklists/dto/create-checklist-template.dto.ts
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// 1. DTO for the individual items within a template
export class CreateChecklistTemplateItemDto {
  @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() required?: boolean;
 @IsOptional() @IsString() text?: string;
}

// 2. DTO for the main template
export class CreateChecklistTemplateDto {
  @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  
  // Array of items - This is the NESTED part!
  @IsArray() 
  @ValidateNested({ each: true }) // Validate every object in the array
  @Type(() => CreateChecklistTemplateItemDto) // Use the item DTO for validation
  items?: CreateChecklistTemplateItemDto[];
}