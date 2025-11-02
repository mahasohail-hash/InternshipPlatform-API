// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    // `user` is attached to the request by the JWT Strategy (AuthGuard('jwt'))
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      console.warn('[RolesGuard] Access denied: User or user.role not found on request.');
      return false;
    }
    
    // 3. Check if the user's role (e.g., 'HR') is in the required roles list
    const hasPermission = requiredRoles.includes(user.role);
    
    if (!hasPermission) {
      console.warn(`[RolesGuard] Access denied: User role '${user.role}' is not in required list [${requiredRoles.join(', ')}]`);
    }

    return hasPermission;
  }
}