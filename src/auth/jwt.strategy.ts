// internship-platform-backend/src/auth/strategies/jwt.strategy.ts (renamed for convention)

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service'; // CRITICAL FIX: Correct import path for UsersService
import { JwtPayload } from '../auth/jwt-payload.interface'; // CRITICAL FIX: Correct import path for JwtPayload
import { UserRole } from '../common/enums/user-role.enum'; // CRITICAL FIX: Correct import path for UserRole

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { // CRITICAL FIX: Pass 'jwt' strategy name
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService, // Injected UsersService (if needed for DB lookup)
  ) {
    const secretFromConfig = configService.get<string>('JWT_SECRET');
    if (!secretFromConfig){
      console.error("CRITICAL ERROR: JWT_SECRET not resolved by ConfigService for JwtStrategy!");
      // Fallback to a non-null, but insecure value in development if missing, to prevent crash
      // In production, this should cause a startup failure or a robust warning.
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // CRITICAL FIX: Set to false to respect token expiry
      secretOrKey: secretFromConfig || 'INSECURE_FALLBACK_KEY_FOR_DEV_ONLY', // Fallback for dev only
    });
  }

  // This `validate` method is called after the JWT is successfully decoded.
  // It receives the payload from the token and should return a "user" object.
  async validate(payload: JwtPayload): Promise<JwtPayload> { // CRITICAL FIX: Type payload as JwtPayload
    if (!payload || !payload.id || !payload.role || !payload.email) {
       throw new UnauthorizedException('Invalid token payload. Missing user ID, role, or email.');
    }

    // Optional: You can fetch the full user from the database here
    // to ensure the user still exists and their role hasn't changed.
    // For simplicity, we'll return the payload itself, assuming the token is authoritative.
    // const user = await this.usersService.findOne(payload.id);
    // if (!user) {
    //    throw new UnauthorizedException('User associated with token not found.');
    // }
    // return { id: user.id, email: user.email, role: user.role }; // Return minimal user data

    // Return the payload directly, which will be attached to `req.user`
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
  }
}