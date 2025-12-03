import { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum';

// This interface matches what JwtStrategy.validate() returns and is attached to req.user
export interface JwtPayload {
    sub: string;      
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
}

// Express Request with attached user
export interface RequestWithUser extends Request {
    user: {
        id: string;       
        email: string;
        role: UserRole;
        firstName?: string;
        lastName?: string;
    };
}
