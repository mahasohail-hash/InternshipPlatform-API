// src/session/session.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { Session } from '../session/session.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!, // Added non-null assertion
        signOptions: { expiresIn: '60s' },
      }),
    }),
    ConfigModule,
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}