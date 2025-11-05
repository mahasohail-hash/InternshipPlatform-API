import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../interfaces/request-with-user.interface'; // CRITICAL FIX: Import RequestWithUser

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>(); // CRITICAL FIX: Cast request to RequestWithUser
    
    // Check if the request user exists (provided by JwtAuthGuard)
    if (!request.user) {
        // This scenario should ideally be caught by JwtAuthGuard throwing an UnauthorizedException.
        // However, if for some reason execution reaches here, returning null/undefined is safe.
        return null;
    }
    
    // Return the whole user object attached by Passport/JWT Guard
    return request.user;
  },
);