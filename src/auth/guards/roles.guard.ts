import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from handler or class metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('No user or role found.');
    }

    const userRoleString = String(user.role).trim().toUpperCase();
    const requiredRolesStrings = requiredRoles.map(r => String(r).trim().toUpperCase());

    const hasPermission = requiredRolesStrings.includes(userRoleString);

    if (!hasPermission) {
      const { url, method } = request;
      this.logger.warn(
        `[${method} ${url}] Access denied: User role '${user.role}' not in required [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `You do not have the required role to access this resource. Required: [${requiredRoles.join(
          ', ',
        )}], Your role: ${user.role}`,
      );
    }

    return true;
  }
}
