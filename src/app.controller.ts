import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { Public } from './auth/decorators/public.decorator';
import { LocalAuthGuard } from './auth/guards/local-auth.guard';
import { RequestWithUser } from './auth/interfaces/request-with-user.interface';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService, // Inject AuthService
  ) {}

  // --- Login endpoint ---
  @Public()
  @UseGuards(LocalAuthGuard) // Validates email/password using LocalStrategy
  @Post('auth/login')
  async login(@Req() req: RequestWithUser) {
    // req.user is populated by LocalStrategy
    return this.authService.login(req.user.email, req.body.password);
  }

  // --- Public endpoint ---
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
