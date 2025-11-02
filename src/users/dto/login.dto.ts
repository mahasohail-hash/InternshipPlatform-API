// src/users/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email!: string;

  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean; // Added this property
}