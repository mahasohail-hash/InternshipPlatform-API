import { IsString, IsOptional, IsUUID, IsEmail, IsEnum } from 'class-validator'; // CRITICAL FIX: Import IsEnum
import { UserRole } from '../../common/enums/user-role.enum';

export class UserBasicDto {
    @IsUUID('4', { message: 'User ID must be a valid UUID.' })
    id!: string;

    @IsString({ message: 'First name must be a string.' })
    @IsOptional()
    firstName?: string | null;

    @IsString({ message: 'Last name must be a string.' })
    @IsOptional()
    lastName?: string | null;

    @IsEmail({}, { message: 'Email must be a valid email address.' })
    email!: string;

    @IsEnum(UserRole, { message: 'Invalid user role.' }) // CRICAL FIX: IsEnum decorator is correct
    @IsOptional()
    role?: UserRole;
}