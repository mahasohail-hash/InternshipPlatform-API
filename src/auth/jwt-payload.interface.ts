import { UserRole } from '../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path

// This interface defines the payload structure that is stored *inside* the JWT token.
// It's what `jwt.strategy.ts`'s `validate` method receives.
export interface JwtPayload {
  id: string; // User ID (UUID string)
  email: string;
  role: UserRole; // User's role (enum)
  // Add any other minimal, non-sensitive data you want directly in the token
  // For example, if you need firstName/lastName frequently without a DB lookup.
}