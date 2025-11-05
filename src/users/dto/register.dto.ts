// This DTO is redundant if `CreateUserDto` is used for all registration.
// It's recommended to consolidate.
// If your authentication uses `username` and `email` as separate fields, you might keep it.
// However, your `CreateUserDto` only uses `email`.

import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path

export class RegisterDto {
  @IsString({ message: 'Username must be a string.' })
  @IsNotEmpty({ message: 'Username is required.' })
  username!: string;

  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' }) // CRITICAL FIX: Consistent min length
  @IsNotEmpty({ message: 'Password is required.' })
  password!: string;

  @IsString({ message: 'First name must be a string.' })
  @IsNotEmpty({ message: 'First name is required.' })
  firstName!: string;

  @IsString({ message: 'Last name must be a string.' })
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName!: string;

  @IsEnum(UserRole, { message: 'Invalid user role.' })
  @IsOptional()
  role?: UserRole;

  @IsString({ message: 'Phone number must be a string.' })
  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Name must be a string.' })
  name?: string; // If this is meant to be a full name field, clarify usage
}

console.warn("`src/users/dto/register.dto.ts` is likely redundant. Consider using `CreateUserDto` for all user creation endpoints.");