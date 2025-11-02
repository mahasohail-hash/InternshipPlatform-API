import { Injectable, UnauthorizedException, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service'; 
import { User } from '../users/entities/users.entity'; 
import * as bcrypt from 'bcrypt'; 
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from '../users/dto/create-user.dto'; 

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>, 
  ) {}

  // --- 1. VALIDATE USER (The Hashing/Login Logic) ---
  async validateUser(email: string, pass: string): Promise<any> {
    
    // Find user and explicitly SELECT the password field
    const user = await this.usersService.findOneByEmailWithPassword(email);

    if (!user || !user.password) { // Check user existence and password retrieval
        // If password wasn't retrieved (even if user exists), treat as failure
        throw new UnauthorizedException('Invalid credentials'); 
    }

    // --- CRITICAL FIX: The FINAL PASSWORD CHECK ---
    let isMatch = await bcrypt.compare(pass, user.password);
    
    // Fail-safe: Try comparison with a trimmed password
    if (!isMatch) {
        isMatch = await bcrypt.compare(pass.trim(), user.password);
    }
    
    if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials'); 
    }
    
    // SUCCESS: Return user object without the password
    const { password, ...result } = user;
    return result; 
  }

  // --- 2. LOGIN (Creates the token) ---
  async login(user: any) {
    const payload = { 
        id: user.id, 
        email: user.email, 
        role: user.role 
    };
    
    return {
      id: user.id, 
      email: user.email, 
      role: user.role, 
      firstName: user.firstName,
      lastName: user.lastName,
      accessToken: this.jwtService.sign(payload,{
        secret: 'MY_SUPER_SECRET_TEST_KEY_123',
      }),
    };
  }

  // --- 3. REGISTER (Ensure user creation logic is consistent) ---
  async register(registerDto: any): Promise<User> {
    let userExists = await this.usersService.findOneByEmail(registerDto.email);
    if (userExists) {
        throw new ConflictException('User already exists.');
    }

    // NOTE: Salt generation and hashing must match logic in app.module.ts setup
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(registerDto.password, salt);
    
    const newUser = this.userRepository.create({ 
        email: registerDto.email,
        password: passwordHash,
        firstName: registerDto.firstName || registerDto.name, 
        lastName: registerDto.lastName || 'User',
         role: registerDto.role || UserRole.INTERN,
    });

    try {
        const savedUser = await this.userRepository.save(newUser);
        const { password, ...result } = savedUser;
        return result as User;
    } catch (error: any) {
        if (error.code === '23505') {
           throw new ConflictException('Email already exists.');
        }
        throw new InternalServerErrorException('Could not save user.'); 
    }
  }
}
