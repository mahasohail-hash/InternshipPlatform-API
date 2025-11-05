import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path

export const ROLES_KEY = 'roles';
// Usage: @Roles(UserRole.HR, UserRole.MENTOR)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);