// src/auth/interfaces/request-with-user.interface.ts
import { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum'; // Adjust path if needed

// Interface for the JWT payload attached by the AuthGuard
interface JwtPayload {
id: number | string;
    email: string;
    role: UserRole;
}

// Interface for the Express Request object with the attached user payload
export interface RequestWithUser extends Request {
    user: JwtPayload;
}