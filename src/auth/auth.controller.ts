import { 
  Controller, Post, Body, Req, Res, Get, HttpStatus, UseGuards, Query, BadRequestException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Response } from 'express';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { SignUpDto } from './dto/signup.dto';
import { OAuthDto } from './dto/oauth.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { User } from '@/users/entities/users.entity';
import { MailerService } from '@/mailer/mailer.service';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mailService: MailerService,
  ) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const loginPayload = await this.authService.login(req.user.email, req.body.password);
    return res.status(HttpStatus.OK).json({ ...loginPayload, message: 'Login successful' });
  }

  @Public()
  @Post('oauth')
  async oauth(@Body() dto: OAuthDto) {
    if (!dto.provider || !dto.profile) throw new BadRequestException('Invalid payload');
    return this.authService.oauthUpsert(dto.provider, dto.profile);
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const fullUser: User = await this.usersService.findOneById(req.user.id);
    const payload = await this.authService.socialLogin(fullUser);

    return res.status(HttpStatus.OK).json({ ...payload, message: 'Google login successful' });
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const fullUser: User = await this.usersService.findOneById(req.user.id);
    const payload = await this.authService.socialLogin(fullUser);

    return res.status(HttpStatus.OK).json({ ...payload, message: 'GitHub login successful' });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.MENTOR)
@Post('send-update')
async sendUpdate(
  @Body() body: { subject: string; message: string; internIds: string[]; from?: string }
) {
  const interns: User[] = await this.usersService.findByIds(body.internIds);

  if (!interns.length) {
    throw new BadRequestException('No valid interns found for the provided IDs');
  }

  const sendResults: { user: string; status: string }[] = [];

  for (const intern of interns) {
    const status = await this.mailService.sendMail({
      to: intern.email!,
      subject: body.subject,
      html: `<p>${body.message}</p><p>From: ${body.from ?? 'HR/Mentor'}</p>`,
    });

    sendResults.push({ user: intern.email!, status });
  }

  // 3️⃣ Return summary
  return {
    status: HttpStatus.OK,
    message: 'Update emails sent successfully',
    ok: true,
    results: sendResults,
  };
}

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    const { token, newPassword } = body;
    if (!token || !newPassword) throw new BadRequestException('Token and new password are required');
    await this.authService.resetPassword(token, newPassword);
    return { status: 200, message: 'Password has been reset successfully!' };
  }

 

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: RequestWithUser) {
    return { status: 200, message: 'Profile fetched successfully', user: req.user };
  }
}
