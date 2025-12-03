import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      return null;
    }

    // Map JWT payload sub -> id if needed
    return {
      id:  request.user.id,
      email: request.user.email,
      role: request.user.role,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
    };
  },
);
