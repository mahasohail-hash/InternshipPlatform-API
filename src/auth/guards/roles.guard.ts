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
   this.logger.debug(`[${method} ${url}] Checking roles for user: ${user?.email || 'N/A'}`);
    this.logger.debug(`[${method} ${url}] User role in JWT: ${user?.role || 'N/A'}`);
    this.logger.debug(`[${method} ${url}] Required roles: [${requiredRoles.join(', ')}]`);
// If no user or user role, deny access (JwtAuthGuard should have caught this first)
    if (!user || !user.role) {
      this.logger.warn(`[${method} ${url}] Access denied: No user or user role found in JWT.`);
      throw new ForbiddenException('You do not have the necessary role to access this resource.');
    }
// Check if the user's role is in the list of required roles
const hasPermission = requiredRoles.includes(user.role);

if (!hasPermission) {
      this.logger.warn(`[${method} ${url}] Access denied: User role '${user.role}' is not in required list [${requiredRoles.join(', ')}]`);
      throw new ForbiddenException('You do not have the necessary role to access this resource.');
    }

    this.logger.debug(`[${method} ${url}] Access granted for role: ${user.role}`);
    return hasPermission;
  }
}