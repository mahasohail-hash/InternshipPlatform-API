import { MiddlewareConsumer, Module, NestModule, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from '../controller/auth.controller'; // CRITICAL FIX: Correct import path for AuthController
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy'; // CRITICAL FIX: Correct import path for JwtStrategy
import { LocalStrategy } from './strategies/local.strategy'; // CRITICAL FIX: Correct import path for LocalStrategy

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
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
             console.warn('WARNING: JWT_SECRET environment variable is missing. Using a fallback.');
        }

        return {
          secret: secretKey || 'INSECURE_FALLBACK_KEY_DO_NOT_USE_IN_PRODUCTION', // Fallback for dev only
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
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule implements NestModule {
    // Middleware configuration for AuthModule (if specific exclusions are needed here)
    configure(consumer: MiddlewareConsumer) {
        // Typically, global exclusion for login/register is done in AppModule.
        // No specific exclusions needed in AuthModule itself unless you want to override global.
    }
}