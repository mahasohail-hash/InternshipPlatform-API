import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) { // Implicitly named 'jwt'
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
const secretFromConfig = configService.get<string>('JWT_SECRET');
 if (!secretFromConfig){
      console.error("CRITICAL ERROR: JWT_SECRET not resolved by ConfigService!");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
// CRITICAL: Use the ConfigService to read the secret
      secretOrKey: configService.get<string>('JWT_SECRET'),    });
  }

 
  async validate(payload: any) {
  
  if (!payload || !payload.id || !payload.role) {
     throw new UnauthorizedException('Invalid token payload.');
  }
  return { 
    id: payload.id, 
    email: payload.email, 
    role: payload.role 
  };
  }
}