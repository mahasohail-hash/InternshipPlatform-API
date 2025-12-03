import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";

export class CreateTemplateDto {
  @IsString()
    @IsNotEmpty()
    name!: string;

  @IsString()
    @IsNotEmpty()
    subject!: string;

  @IsString()
    @IsNotEmpty()
    html!: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;
}
