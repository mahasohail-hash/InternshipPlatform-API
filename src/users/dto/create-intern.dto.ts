// src/users/dto/create-intern.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { UserRole } from '../entities/users.entity';

export class CreateInternDto {
  @IsNotEmpty()
    @IsString()
    firstName!: string;

  @IsNotEmpty()
    @IsString()
    lastName!: string;

  @IsNotEmpty()
    @IsEmail()
    email!: string;

  @IsNotEmpty()
    @IsString()
    password!: string;

  @IsNotEmpty()
    @IsString()
  role: UserRole = UserRole.INTERN; 
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistIds?: string[]; // array of checklist template IDs
}
