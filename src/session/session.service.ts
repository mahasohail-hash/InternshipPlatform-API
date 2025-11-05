import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from '../session/session.entity';
import { User } from '../users/entities/users.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
// import { UsersService } from '../users/users.service'; // CRITICAL FIX: UsersService not directly needed here, as User repo is enough

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>, // CRITICAL FIX: Keep User repo if needed for validation
    private jwtService: JwtService,
    private configService: ConfigService,
    // private usersService: UsersService, // Removed as User repo is sufficient for most session operations
  ) {}

  // Helper to create a user payload (if needed externally for a session context)
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

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
        throw new InternalServerErrorException('JWT_SECRET not configured for session service.');
    }

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, rememberMe },
      { secret: jwtSecret, expiresIn }
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

  async updateLastActivity(sessionId: number): Promise<void> { // CRITICAL FIX: sessionId is number
      await this.sessionRepository.update(sessionId, { lastActivityAt: new Date() });
  }

  async cleanupExpiredSessions(): Promise<void> {
      await this.sessionRepository.delete({ expiresAt: LessThan(new Date()) });
  }
}