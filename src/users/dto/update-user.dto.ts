import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto'; // CRITICAL FIX: Correct import path
import { IsOptional, IsString, IsEmail, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // Overriding 'password' to allow it to be updated separately (e.g., via settings)
  // But `ChangePasswordDto` is preferred for password changes.
  @IsOptional()
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'First name must be a string.' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string.' })
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role.' })
  role?: UserRole;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string.' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'GitHub username must be a string.' })
  githubUsername?: string;
}