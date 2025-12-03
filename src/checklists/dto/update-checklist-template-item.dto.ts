import { IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';

export class UpdateChecklistTemplateItemDto {
  @IsUUID()
  @IsOptional()
  id?: string; // Optional ID for updating an existing template item

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string; // Optional title update

  @IsOptional()
  @IsString()
  description?: string; // Optional description update

  @IsOptional()
  @IsString()
  text?: string; // Optional text content update
}
