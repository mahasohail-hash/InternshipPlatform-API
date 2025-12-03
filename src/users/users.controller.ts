import {
  Controller, Post, Patch, Body, UseGuards, Get, Delete, Param,
  ParseUUIDPipe, Request, UnauthorizedException, BadRequestException,
  HttpCode, HttpStatus, ConflictException, Query, InternalServerErrorException,
  NotFoundException, ForbiddenException
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateInternDto } from './dto/create-intern.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { InternUserDto } from './dto/intern-user.dto';
import { UpdateGithubDto } from './dto/update-github.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- 1. Change My Password ---
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN, UserRole.OBSERVER)
  async changeMyPassword(
    @Request() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('User ID missing from token.');

    try {
      await this.usersService.updatePassword(userId, changePasswordDto);
      return { message: 'Password changed successfully.' };
    } catch (error: any) {
      if (error instanceof BadRequestException ||
          error instanceof NotFoundException ||
          error instanceof UnauthorizedException) throw error;

      console.error('[UsersController] Password change error:', error);
      throw new InternalServerErrorException('Failed to change password.');
    }
  }

  // --- 2. Create Intern ---
  @Post('intern')
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  createIntern(@Body() createInternDto: CreateInternDto) {
    return this.usersService.createIntern(createInternDto);
  }

  // --- 3. Get All Interns for HR Dashboard ---
  @Get('interns')
  @Roles(UserRole.HR, UserRole.MENTOR)
  async findAllInternsForHrDashboard(): Promise<InternUserDto[]> {
    return this.usersService.getInternsForHR();
  }

  // --- 4. Get Interns for Mentor Dropdown ---
  @Get('interns-for-mentor')
  @Roles(UserRole.MENTOR, UserRole.HR)
  async findAllInternsForMentor(): Promise<InternUserDto[]> {
    return this.usersService.findUsersByRole(UserRole.INTERN);
  }

  // --- 5. Find Users by Role ---
  @Get()
  @Roles(UserRole.HR)
  async findAllUsers(@Query('role') role?: UserRole): Promise<InternUserDto[]> {
    return this.usersService.findUsersByRole(role);
  }

  // --- 6. Find Single User by ID ---
  @Get(':id')
  @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
  async findOne(
    @Request() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const callerId = req.user.id;
    const callerRole = req.user.role;

    if (callerRole !== UserRole.HR && callerRole !== UserRole.MENTOR && callerId !== id) {
      throw new ForbiddenException('You can only view your own profile.');
    }

    return this.usersService.findOneById(id);
  }

  // --- 7. Delete User ---
  @Delete(':id')
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.remove(id);
  }

  // --- 8. Update GitHub Username ---
  @Patch(':id/github')
  @Roles(UserRole.HR, UserRole.MENTOR)
  async updateGithubUsername(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGithubDto
  ) {
    return this.usersService.updateGithubUsername(id, body.githubUsername ?? null);
  }

  // --- 9. Assign Multiple Templates to Interns ---
  @Post('assign-multiple')
  @Roles(UserRole.HR)
  async assignMultiple(
    @Body() body: { templateIds: string[]; internIds: string[] }
  ) {
    return this.usersService.assignTemplatesToInterns(body.templateIds, body.internIds);
  }

  // --- 10. Setup Initial User (Unprotected) ---
  @Post('setup-initial-user')
  @HttpCode(HttpStatus.CREATED)
  async setupInitialUser(@Body() setupDto: CreateUserDto) {
    if (!setupDto.email || !setupDto.password || !setupDto.firstName || !setupDto.lastName || !setupDto.role) {
      throw new BadRequestException('All fields required for setup.');
    }

    const anyUserExists = await this.usersService.checkIfAnyUserExists();
    if (anyUserExists) throw new ConflictException('Setup already completed.');

    const user = await this.usersService.createUser(setupDto);
    const { password, ...result } = user as any;
    return { message: `Initial ${user.role} user created.`, user: result };
  }
}
