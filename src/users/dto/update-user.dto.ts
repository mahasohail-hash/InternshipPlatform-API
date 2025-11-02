// src/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsEmail, MinLength, IsEnum } from 'class-validator'; // Added IsEnum
import { UserRole } from '../../common/enums/user-role.enum'; // Import UserRole enum

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole) // Validate against UserRole enum
  role?: UserRole; // Changed type to UserRole

  @IsOptional()
  @IsString()
  phone?: string;
}