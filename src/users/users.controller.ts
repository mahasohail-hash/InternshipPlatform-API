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
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

// Applying Guards at the class level
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    // 1. Change Password - PATCH api/users/me/password
    @Patch('me/password')
    @HttpCode(HttpStatus.OK)
    @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
    async changeMyPassword(
        @Request() req: RequestWithUser,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        const userIdFromToken = req.user?.id;
        if (!userIdFromToken) {
            // This case should be caught by the Guard, but it's good defensive coding
            throw new UnauthorizedException('User ID not found in token payload.');
        }

        const userIdAsString = String(userIdFromToken); 

        try {
            await this.usersService.updatePassword(userIdAsString, changePasswordDto);
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
    @Post('interns')
    @Roles(UserRole.HR)
    createIntern(@Body() createInternDto: CreateUserDto) { 
        return this.usersService.createIntern(createInternDto);
    }

    // 3. Find All Interns (Dedicated Endpoint) - GET api/users/interns
    @Get('interns') 
    @Roles(UserRole.HR, UserRole.MENTOR)
    async findAllInterns() {
        console.log("[DEBUG] Executing GET /api/users/all-interns-list");
        // We assume the service logic is ready to execute
        return this.usersService.findUsersByRole(); 
    }

    // 4. Find All Users (General Endpoint) - GET api/users?role=...
    // This consolidated method handles the general listing/filtering
    @Get() 
    @Roles(UserRole.HR) 
    async findAll(
        @Query('role') role?: UserRole
    ) {
        // FIX: Service logic handles filtering by role or returning all users for HR
        return this.usersService.findUsersByRole(role); 
    }

    // 5. Find Single User By ID - GET api/users/:id
    // 🛑 FIX: This parameterized route MUST be placed AFTER the static 'interns' route.
    @Get(':id')
    @Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
    async findOne(
        @Request() req: RequestWithUser, // Inject user for authorization logic
        @Param('id', ParseUUIDPipe) id: string
    ) {
        const callerId = req.user.id;
        const callerRole = req.user.role;

        // Security Check: Only allow viewing own profile unless HR/Mentor
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
    @Roles(UserRole.HR) 
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.usersService.remove(id);
    }

    // 7. Setup Initial User (Unprotected) - POST api/users/setup-initial-user
    // This route needs to be unprotected, so we MUST override the class-level guards.
    @UseGuards() // Temporarily disables class-level guards
    @Post('setup-initial-user')
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