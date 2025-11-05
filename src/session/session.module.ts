import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { Session } from './session.entity';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, User]),
    forwardRef(() => UsersModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const secret = configService.get<string>('JWT_SECRET')!;
        // CRITICAL FIX: expiresIn can be string or number, ensure it's compatible.
        // It's already `string` from config, so `as string` isn't strictly needed for the type.
const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '7d') as string;
        return {
          secret: secret,
      signOptions: { expiresIn: expiresIn as any },
      };
      },
    }),
    ConfigModule,
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}