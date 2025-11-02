// src/session/session.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from '../session/session.entity';
import { User } from '../users/entities/users.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service'; // Corrected: Using UsersService

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async createSession(
    userId: string, // Changed from number to string (UUID)
    rememberMe: boolean = false,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ token: string; session: Session }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));

    const token = this.jwtService.sign(
      {
        sub: user.id, // user.id is string
        role: user.role,
        rememberMe,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn,
      },
    );

    const session = this.sessionRepository.create({
      userId, // userId is string
      token,
      deviceInfo,
      ipAddress,
      lastActivityAt: new Date(),
      rememberMe,
      expiresAt,
    });

    await this.sessionRepository.save(session);

    return { token, session };
  }

  async endAllUserSessions(userId: string): Promise<void> { // Changed from number to string
    await this.sessionRepository.delete({ userId });
  }

  async validateSession(token: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.expiresAt < new Date()) {
      await this.sessionRepository.delete(session.id); // session.id is UUID (string)
      throw new UnauthorizedException('Session expired');
    }

    return session;
  }

  async updateLastActivity(sessionId: string): Promise<void> { // Changed from number to string (UUID)
    await this.sessionRepository.update(sessionId, {
      lastActivityAt: new Date(),
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}