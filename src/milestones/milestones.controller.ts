// src/milestones/milestones.controller.ts

import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  BadRequestException,
  UnauthorizedException // Ensure this is imported from @nestjs/common
} from '@nestjs/common'; 
import { Request } from 'express'; // Import Request type from express
import { MilestonesService } from './milestones.service';
import { Project } from '../projects/entities/project.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { RolesGuard } from '../auth/guards/roles.guard'; 
import { Roles } from '../auth/decorators/roles.decorator'; 
import { AuthGuard } from '@nestjs/passport'; 
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/users.entity'; // Use the correct User entity path/name

// FIX: Define the RequestWithUser type correctly to include the JWT payload fields
interface RequestWithUser extends Request {
  user: { id: string, role: UserRole } & Partial<User>; // User is attached by JWT guard
}





@Controller('milestones')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Global authentication and authorization check
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  // FIX: This is the ONLY 'create' function now. It accepts a projectId as a param
  // if you want to enforce the project ID in the URL structure.
  @Post(':projectId') // Example: POST /milestones/a-project-uuid
  @Roles(UserRole.MENTOR)
  create(
    @Param('projectId') projectId: string, // Get projectId from URL
    @Body() createMilestoneDto: CreateMilestoneDto, 
    @Req() req: RequestWithUser
  ) { 
    // SECURITY CHECK: User must be authenticated to have req.user
    if (!req.user?.id) {
        throw new UnauthorizedException('User not authenticated.');
    }
    
    // LOGIC CHECK 1: Ensure project ID in body matches URL param (if DTO includes projectId)
    // NOTE: If you embed projectId in the DTO, you should not use it here to avoid redundancy.
    // Assuming DTO does NOT have projectId and you inject it here.
    
    const mentorId = req.user.id;
    
    // FIX: Pass the mentorId and the projectId to the service.
    return this.milestonesService.create(createMilestoneDto, projectId, mentorId);
  }

  // NOTE: If you only want to use one POST endpoint, you should decide if the projectId is
  // a URL param or part of the DTO body. I've consolidated to one, using the URL for better REST structure.


  @Get() // GET /milestones (Find all for a mentor or HR/Observer)
  @Roles(UserRole.MENTOR, UserRole.HR)
  findAll(
    @Param('projectId') projectId: string, // NOTE: This will only work if the route is defined as /milestones/:projectId
    @Req() req: RequestWithUser // FIX: Use the correct interface
  ) {
    const mentorId = req.user.id;
    // The service must handle filtering by projectId (if present) AND ownership by mentorId.
    return this.milestonesService.findAll(projectId, mentorId); 
  }

  @Get(':milestoneId') // GET /milestones/:milestoneId
  @Roles(UserRole.MENTOR, UserRole.HR)
  findOne(
    @Param('milestoneId') milestoneId: string, 
    @Req() req: RequestWithUser // FIX: Use the correct interface
  ) {
    const mentorId = req.user.id;
    return this.milestonesService.findOne(milestoneId, mentorId);
  }

  @Patch(':milestoneId') // PATCH /milestones/:milestoneId
  @Roles(UserRole.MENTOR, UserRole.HR)
  update(
    @Param('milestoneId') milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
    @Req() req: RequestWithUser, // FIX: Use the correct interface
  ) {
    const mentorId = req.user.id;
    return this.milestonesService.update(milestoneId, updateMilestoneDto, mentorId);
  }

  @Delete(':milestoneId') // DELETE /milestones/:milestoneId
  @Roles(UserRole.MENTOR, UserRole.HR)
  remove(
    @Param('milestoneId') milestoneId: string, 
    @Req() req: RequestWithUser // FIX: Use the correct interface
  ) {
    const mentorId = req.user.id;
    return this.milestonesService.remove(milestoneId, mentorId);
  }
}