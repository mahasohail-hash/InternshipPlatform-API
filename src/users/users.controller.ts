import {
    Controller, Post, Patch, Body, UseGuards, Get, Delete, Param,
    ParseUUIDPipe, Request, UnauthorizedException, BadRequestException,
    HttpCode, HttpStatus, ConflictException, Query, InternalServerErrorException,
    NotFoundException, ForbiddenException
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface'; // CRITICAL FIX: Correct import path
import { UserMinimalDto } from './dto/user-minimal.dto'; // Example DTO
import { InternUserDto } from './dto/intern-user.dto'; // Example DTO for intern list
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateGithubDto } from './dto/update-github.dto';
// Applying Guards at the class level
@UseGuards(JwtAuthGuard, RolesGuard) // CRITICAL FIX: Apply JwtAuthGuard globally to the controller
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    // 1. Change Password - PATCH api/users/me/password
    @Patch('me/password')
    @HttpCode(HttpStatus.OK)
    @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN, UserRole.OBSERVER) // All authenticated users can change their password
    async changeMyPassword(
        @Request() req: RequestWithUser,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
          const userIdFromToken = req.user?.id as string; 
        if (!userIdFromToken) {
            throw new UnauthorizedException('User ID not found in token payload.');
        }

        try {
            await this.usersService.updatePassword(userIdFromToken, changePasswordDto);
            return { message: 'Password changed successfully.' };
        } catch (error: any) {
            if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
                throw error;
            }
            console.error("Error changing password in controller:", error);
            throw new InternalServerErrorException("Failed to change password.");
        }
    }

    // 2. Create Intern - POST api/users/intern
    @Post('intern')
    @Roles(UserRole.HR) // Only HR can create interns
    @HttpCode(HttpStatus.CREATED)
    createIntern(@Body() createInternDto: CreateUserDto) {
        // Ensure the role is explicitly set to INTERN for this endpoint
        createInternDto.role = UserRole.INTERN;
        return this.usersService.createIntern(createInternDto);
    }

    // 3. Find All Interns (Dedicated Endpoint for HR dashboard table) - GET api/users/interns
    @Get('interns') // This endpoint remains for HR's comprehensive table data
    @Roles(UserRole.HR, UserRole.MENTOR) // Mentors can also see this list, but it's designed for HR data
    async findAllInternsForHrDashboard() { // Renamed for clarity
        console.log("[UsersController] Executing GET /api/users/interns for HR dashboard.");
        return this.usersService.getInternsForHR();
    }

    @Get('interns-for-mentor') // NEW ENDPOINT
    @Roles(UserRole.MENTOR, UserRole.HR) // Mentors and HR can get this list
    async findAllInternsForMentor() {
        console.log("[UsersController] Executing GET /api/users/interns-for-mentor for dropdown.");
        // We'll update findUsersByRole to handle this specifically
        return this.usersService.findUsersByRole(UserRole.INTERN);
    }

    @Get()
    @Roles(UserRole.HR)
    async findAll(@Query('role') role?: UserRole) {
        return this.usersService.findUsersByRole(role);
    }
    // 4. Find All Users (General Endpoint, HR-specific for filtering other roles) - GET api/users?role=...
    @Get()
    @Roles(UserRole.HR) // Only HR can view all users
    async findAllUsers(@Query('role') role?: UserRole): Promise<InternUserDto[]> { // Can return InternUserDto[] or a more generic UserDto[]
        return this.usersService.findUsersByRole(role);
    }

    // 5. Find Single User By ID - GET api/users/:id
   @Get(':id')
    @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
    async findOne(
        @Request() req: RequestWithUser,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        const callerId = req.user.id as string; // CRITICAL FIX: Cast to string
        const callerRole = req.user.role;

        if (callerRole !== UserRole.HR && callerRole !== UserRole.MENTOR && callerId !== id) {
            throw new ForbiddenException('You can only view your own profile.');
        }

        try {
            const user = await this.usersService.findOne(id);
            return user;
        } catch (error) {
            console.error(`[UsersController] Error in findOne for ID ${id}:`, error);
            throw error;
        }
    }

    // 6. Delete User - DELETE api/users/:id
    @Delete(':id')
    @Roles(UserRole.HR) // Only HR can delete users
    @HttpCode(HttpStatus.NO_CONTENT) // Use 204 No Content for successful deletion
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.usersService.remove(id);
    }


      @Patch(':id/github')
  @Roles(UserRole.HR, UserRole.MENTOR) // OPTIONAL: adjust per your policies
  async updateGithubUsername(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGithubDto,
  ) {
return this.usersService.updateGithubUsername(id, body.githubUsername ?? null);
  }

    // 7. Setup Initial User (Unprotected) - POST api/users/setup-initial-user
    // This endpoint must be public because it's used before any users exist.
   @UseGuards()
    @Post('setup-initial-user')
    @HttpCode(HttpStatus.CREATED)
    async setupInitialUser(@Body() setupDto: CreateUserDto) {
        console.warn(`[SETUP] Attempting initial user setup: ${setupDto.email}`);

        if (!setupDto.email || !setupDto.password || !setupDto.firstName || !setupDto.lastName || !setupDto.role) {
            throw new BadRequestException('All fields required for setup.');
        }

        const anyUserExists = await this.usersService.checkIfAnyUserExists();
        if (anyUserExists) {
            console.error('[SETUP] Aborted: Users already exist.');
            throw new ConflictException('Setup already completed.');
        }

        const user = await this.usersService.create(setupDto);
        console.log(`[SETUP] Success: Created initial ${user.role} user: ${user.email}`);

        const { password, ...result } = user as any;
        return { message: `Initial ${user.role} user created.`, user: result };
    }
}