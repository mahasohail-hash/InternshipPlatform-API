import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateChecklistTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  title!: string; // Title of the checklist item

  @IsOptional()
  @IsString()
  description?: string; // Optional description for the item

  @IsOptional()
  @IsBoolean()
  required?: boolean; // Whether this item is required or optional

  @IsOptional()
  @IsString()
  text?: string; // Optional text field for additional content or instructions
}
