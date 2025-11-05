import { IsString, IsUUID, IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Import UserRole

// This DTO provides the absolute minimum user information.
// Useful for contexts where only ID and role are strictly necessary.
export class UserMinimalDto {
    @IsUUID('4', { message: 'ID must be a valid UUID.' })
    id!: string;

    @IsEnum(UserRole, { message: 'Invalid user role.' })
    role!: UserRole;
}