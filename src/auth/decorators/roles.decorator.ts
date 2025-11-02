// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

export const ROLES_KEY = 'roles';
// Usage: @Roles(UserRole.HR, UserRole.MENTOR)
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);