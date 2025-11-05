import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator'; // CRITICAL FIX: Add IsOptional for optional fields
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path

export class CreateUserDto {
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsNotEmpty({ message: 'Password is required.' })
  password!: string;

  @IsString({ message: 'First name must be a string.' })
  @IsNotEmpty({ message: 'First name is required.' })
  firstName!: string;

  @IsString({ message: 'Last name must be a string.' })
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName!: string;

  @IsEnum(UserRole, { message: 'Invalid user role.' })
  @IsOptional() // CRITICAL FIX: Make role optional if endpoint defaults it (e.g., /users/intern)
  role?: UserRole;

  @IsString({ message: 'GitHub username must be a string.' })
  @IsOptional() // GitHub username is optional for initial creation
  githubUsername?: string;
}