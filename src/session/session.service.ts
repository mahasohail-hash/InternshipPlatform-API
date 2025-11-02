import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from '../session/session.entity'; // Adjust path
import { User } from '../users/entities/users.entity'; // Adjust path
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
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

  
  createSessionPayload(user: User) {
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async createSession(
    userId: string,
    rememberMe: boolean = false,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ token: string; session: Session }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found for session creation');
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, rememberMe },
      { secret: this.configService.get<string>('JWT_SECRET'), expiresIn }
    );

    const session = this.sessionRepository.create({
      userId, token, deviceInfo, ipAddress,
      lastActivityAt: new Date(), rememberMe, expiresAt,
    });
    await this.sessionRepository.save(session);
    return { token, session };
  }

  async endAllUserSessions(userId: string): Promise<void> {
      await this.sessionRepository.delete({ userId });
  }
  async validateSession(token: string): Promise<Session | null> {
    const session = await this.sessionRepository.findOne({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
        if (session) await this.sessionRepository.delete(session.id); // Clean up expired
        return null; // Invalid or expired
    }
    return session;
  }
  async updateLastActivity(sessionId: number): Promise<void> {
      await this.sessionRepository.update(sessionId, { lastActivityAt: new Date() });
  }
  async cleanupExpiredSessions(): Promise<void> {
      await this.sessionRepository.delete({ expiresAt: LessThan(new Date()) });
  }
}