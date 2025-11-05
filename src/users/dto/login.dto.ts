import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email!: string;

  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' }) // CRITICAL FIX: MinLength 8 for consistency
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}