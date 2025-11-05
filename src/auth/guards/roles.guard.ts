import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'; // CRITICAL FIX: Import ForbiddenException
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from '../interfaces/request-with-user.interface'; // CRITICAL FIX: Import RequestWithUser
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name); 
constructor(private reflector: Reflector) {}
canActivate(context: ExecutionContext): boolean {
const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
context.getHandler(),

context.getClass(),
]);

// If no roles are required, allow access
if (!requiredRoles || requiredRoles.length === 0) {
  return true;
}

// Get the user from the request (attached by JwtAuthGuard)
  const { user, url, method } = context.switchToHttp().getRequest<RequestWithUser>();
   this.logger.log(`[${method} ${url}] Checking roles for user: ${user?.email || 'N/A'}`);
    this.logger.log(`[${method} ${url}] User role in JWT: ${user?.role || 'N/A'} (type: ${typeof user?.role}, value: ${JSON.stringify(user?.role)})`);
    this.logger.log(`[${method} ${url}] Required roles: [${requiredRoles.map(r => `${r} (type: ${typeof r}, value: ${JSON.stringify(r)})`).join(', ')}]`);
// If no user or user role, deny access (JwtAuthGuard should have caught this first)
    if (!user || !user.role) {
      this.logger.warn(`[${method} ${url}] Access denied: No user or user role found in JWT.`);
      throw new ForbiddenException('You do not have the necessary role to access this resource.');
    }
// Check if the user's role is in the list of required roles
// CRITICAL FIX: Convert both to strings for robust comparison (handles enum vs string mismatch)
const userRoleString = String(user.role).trim().toUpperCase();
const requiredRolesStrings = requiredRoles.map(r => String(r).trim().toUpperCase());
this.logger.log(`[${method} ${url}] Comparing: userRole='${userRoleString}' against requiredRoles=[${requiredRolesStrings.join(', ')}]`);

const hasPermission = requiredRolesStrings.includes(userRoleString);

if (!hasPermission) {
      this.logger.warn(`[${method} ${url}] Access denied: User role '${user.role}' (normalized: '${userRoleString}') is not in required list [${requiredRoles.join(', ')}] (normalized: [${requiredRolesStrings.join(', ')}])`);
      throw new ForbiddenException(`You do not have the necessary role to access this resource. Required: [${requiredRoles.join(', ')}], Your role: ${user.role}`);
    }

    this.logger.log(`[${method} ${url}] Access granted for role: ${user.role}`);
    return hasPermission;
  }
}