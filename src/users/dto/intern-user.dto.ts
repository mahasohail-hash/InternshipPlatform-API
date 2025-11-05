import { IsString, IsOptional, IsUUID, IsEmail, IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Import UserRole

export class InternUserDto {
    @IsUUID('4', { message: 'ID must be a valid UUID.' })
    id!: string;

    @IsString({ message: 'First name must be a string.' })
    firstName!: string;

    @IsString({ message: 'Last name must be a string.' })
    lastName!: string;

    @IsEmail({}, { message: 'Email must be a valid email address.' })
    email!: string;

    @IsOptional()
    @IsEnum(UserRole, { message: 'Invalid user role.' })
    role?: UserRole; // Optional field for safety
}