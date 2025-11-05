import { Injectable, UnauthorizedException, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/users.entity';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import { JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
        return null;
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);

    if (isMatch) {
        const { passwordHash, ...result } = user;
        return result as User;
    }

    return null;
  }

  async login(user: User) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
        console.error("JWT_SECRET is not configured for AuthService.login. Falling back to default.");
        throw new InternalServerErrorException('JWT secret not configured.');
    }

    const expiresInValue = this.configService.get<string>('JWT_EXPIRES_IN', '7d');

    // CRITICAL FIX: Cast expiresIn to `any` as a last resort to bypass persistent `jsonwebtoken` type issues.
    // This is often needed with certain library versions where types are overly strict.
    const signOptions: JwtSignOptions = {
      secret: jwtSecret,
      expiresIn: expiresInValue as any, // Use `any` here
    };

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      accessToken: this.jwtService.sign(payload, signOptions),
    };
  }

  async register(registerDto: CreateUserDto): Promise<User> {
    return this.usersService.create(registerDto);
  }
}