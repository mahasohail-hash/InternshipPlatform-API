// internship-platform-backend/src/auth/strategies/local.strategy.ts (renamed for convention)

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service'; // CRITICAL FIX: Correct import path for AuthService

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') { // CRITICAL FIX: Pass 'local' strategy name
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Tell Passport to use 'email' from the request body as the username
      passwordField: 'password', // Tell Passport to use 'password' from the request body
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    // If valid, Passport will attach this user object to req.user (without passwordHash)
    return user;
  }
}