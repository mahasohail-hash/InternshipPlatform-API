// src/auth/interfaces/jwt-payload.interface.ts
import { UserRole } from '../shared/enums/role.enum'; 

export interface JwtPayload {
  email: string;
  sub: number; // User ID
  role: UserRole;
}