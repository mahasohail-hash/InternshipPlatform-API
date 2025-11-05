import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common'; // CRITICAL FIX: Import UnauthorizedException
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'; // Import public decorator key

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // CRITICAL FIX: Override canActivate to check for public routes
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true; // Allow access to public routes without JWT validation
    }
    // For protected routes, trigger the JWT authentication flow
    return super.canActivate(context);
  }

  // CRITICAL FIX: Override handleRequest to throw UnauthorizedException explicitly
  // This ensures a 401 is always returned if authentication fails for a protected route.
  handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on error or user
    if (err || !user) {
      // console.log('[JwtAuthGuard] Authentication failed:', err || info); // Debugging
      throw err || new UnauthorizedException('Authentication failed. Invalid or missing token.');
    }
    return user;
  }
}