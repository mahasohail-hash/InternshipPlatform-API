// src/auth/jwt-payload.interface.ts
import { UserRole } from '../common/enums/user-role.enum';


export interface JwtPayload {
  sub: string;        // User ID (UUID string)
  email: string;      // User email
  role: UserRole;     // User's role (enum)
 
}
