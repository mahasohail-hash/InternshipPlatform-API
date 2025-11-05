import { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path

// Interface for the JWT payload that JwtAuthGuard attaches to `req.user`
interface JwtPayload {
    id: string; // CRITICAL FIX: User ID is a UUID (string)
    email: string;
    role: UserRole;
}

// Interface for the Express Request object with the attached user payload
export interface RequestWithUser extends Request {
    user: JwtPayload;
}