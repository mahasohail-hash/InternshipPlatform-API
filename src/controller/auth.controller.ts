// src/controller/auth.controller.ts (Adjust path if needed)
import { Controller, Post, Body, Res, HttpStatus,HttpCode, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { LoginDto } from '../users/dto/login.dto'; // Unused?
import { RegisterDto } from '../users/dto/register.dto'; // Unused? Use CreateUserDto?
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { User } from '../users/entities/users.entity'; // Import User entity

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: any, @Res({ passthrough: true }) res: Response): Promise<any> {
    try {
      // Assuming register returns the created user (without password)
      const user = await this.authService.register(registerDto);
      // Pass the returned user object to login
      const loginPayload = await this.authService.login(user); // Pass User object
      return res.status(HttpStatus.CREATED).json({
          message: 'User registered successfully!',
          ...loginPayload // loginPayload now contains all needed info + accessToken
      });
    } catch (error: any) { // Catch specific errors if needed (e.g., ConflictException)
      console.error('NestJS Registration Error:', error.message);
      // Return specific status codes based on error type
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ message: error.message || 'Server error during registration.' });
    }
  }

  @UseGuards(AuthGuard('local')) // 'local' strategy validates and attaches user to req
  
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    // req.user is populated by AuthGuard('local') after validateUser succeeds
    // It should be the user object *without* the password hash
    const user = req.user as User; // Assert type if confident AuthGuard provides full User object (minus password)

    if (!user) {
        // This shouldn't happen if AuthGuard passes, but defensively check
        throw new UnauthorizedException('Authentication failed.');
    }

    // --- FIX: Pass the correct user object ---
    // Pass the validated user object (without password) from req.user
    const loginPayload = await this.authService.login(user);
    // --- End Fix ---

    // Return the combined payload
    // The structure should match what NextAuth expects if using that
    return {
        // Spread user details IF NOT already included in loginPayload
        // id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName,
        ...loginPayload // Contains accessToken and potentially user details already
    };
  }
}