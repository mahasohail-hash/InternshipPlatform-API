// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from '../controller/auth.controller'; 
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'; 
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy'; 

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    ConfigModule, 
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => {
        
        const secretKey = configService.get<string>('JWT_SECRET');
        const expiresInValue = configService.get<string>('JWT_EXPIRES_IN') || '7d';

        if (!secretKey) {
             console.warn('WARNING: JWT_SECRET environment variable is missing.');
        }

        return {
          secret: secretKey || 'INSECURE_FALLBACK_KEY',
          signOptions: {
            
            expiresIn: expiresInValue as string,
          },
        } as JwtModuleOptions; 
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy, 
    JwtStrategy, 
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}