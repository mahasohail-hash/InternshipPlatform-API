import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException, UnauthorizedException, Query, ParseUUIDPipe, HttpCode, HttpStatus, ForbiddenException
} from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post(':projectId')
  @Roles(UserRole.MENTOR)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
    @Req() req: RequestWithUser // CRITICAL FIX: Required parameters should come before optional ones. This is correct as is.
  ) {
    if (!req.user?.id) {
        throw new UnauthorizedException('User not authenticated.');
    }
    const mentorId = req.user.id;
    return this.milestonesService.create(createMilestoneDto, projectId, mentorId);
  }

  @Get()
  @Roles(UserRole.MENTOR, UserRole.HR)
  findAll(
    @Req() req: RequestWithUser, // CRITICAL FIX: Make req a required parameter since it's used for auth.
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string, // projectId is optional
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.milestonesService.findAll(projectId, userId, userRole);
  }

  @Get(':milestoneId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  findOne(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Req() req: RequestWithUser
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.milestonesService.findOne(milestoneId, userId, userRole);
  }

  @Patch(':milestoneId')
  @Roles(UserRole.MENTOR)
  update(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
    @Req() req: RequestWithUser,
  ) {
    const mentorId = req.user.id;
    return this.milestonesService.update(milestoneId, updateMilestoneDto, mentorId);
  }

  @Delete(':milestoneId')
  @Roles(UserRole.MENTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Req() req: RequestWithUser
  ): Promise<void> {
    const mentorId = req.user.id;
    await this.milestonesService.remove(milestoneId, mentorId);
  }
}