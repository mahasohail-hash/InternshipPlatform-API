import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    
    // Check if the request user exists (provided by JwtAuthGuard)
    if (!request.user) {
        // NOTE: The JwtAuthGuard should have already thrown UnauthorizedException (401)
        // If execution reaches here, something is fundamentally wrong, but we return null/undefined
        return null; 
    }
    
    // Return the whole user object attached by Passport/JWT Guard
    return request.user;
  },
);
