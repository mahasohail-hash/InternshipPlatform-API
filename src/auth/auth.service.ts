import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/users.entity';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Validate user credentials
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    return user;
  }

  // Generate JWT token
  generateToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    });
  }

  // Credentials login
  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const access_token = this.generateToken(user);
    return {
      status: 200,
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        provider: user.provider || 'credentials',
      },
    };
  }

  // Sign-up
 async signUp(dto: SignUpDto) {
  const exists = await this.usersService.findOneByEmail(dto.email).catch(() => null);
  if (exists) throw new BadRequestException('Email already in use');

  // Hash password
  const passwordHash = await bcrypt.hash(dto.password, 10);

  // Map to CreateUserDto
  const user = await this.usersService.createUser({
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    password: passwordHash,  
    role: UserRole.INTERN,
    provider: 'credentials',
  });

  const access_token = this.generateToken(user);

  return {
    status: 201,
    access_token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name || `${user.firstName} ${user.lastName}`.trim(),
      provider: user.provider || 'credentials',
    },
  };
}


  // OAuth upsert
  async oauthUpsert(provider: string, profile: any) {
    const providerId = profile.id?.toString();
    let user: User | null = null;

    if (providerId) {
      user = await this.usersService.findByProviderId(provider, providerId);
    }

    if (!user && profile.email) {
      user = await this.usersService.findOneByEmail(profile.email).catch(() => null);
    }

    if (!user) {
    user = await this.usersService.createUser({
  email: profile.email ?? '',
  firstName: profile.firstName ?? profile.name ?? '', 
  lastName: profile.lastName ?? '',                
  password: '', 
  provider,
  providerId,
  role: UserRole.INTERN,
});


    } else if (!user.provider) {
      user.provider = provider;
      user.providerId = providerId;
      await this.usersService.update(user.id, user);
    }

    if (provider === 'github' && ![UserRole.MENTOR, UserRole.INTERN].includes(user.role)) {
      throw new UnauthorizedException('GitHub sign-in not allowed for this role');
    }

    return this.socialLogin(user);
  }

  // Social login helper
  async socialLogin(user: User) {
    const access_token = this.generateToken(user);
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        provider: user.provider || 'credentials',
      },
    };
  }

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) throw new BadRequestException('Invalid reset token');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.usersService.update(user.id, user);
  }
}
