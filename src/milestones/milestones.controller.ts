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
  UnauthorizedException,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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

  // --- Create milestone ---
  @Post(':projectId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.id) throw new UnauthorizedException('User not authenticated.');
    const mentorId = req.user.id;
    return this.milestonesService.create(createMilestoneDto, projectId, mentorId);
  }

  // --- Get all milestones (optional project filter) ---
  @Get()
  @Roles(UserRole.MENTOR, UserRole.HR)
  findAll(
    @Req() req: RequestWithUser,
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string,
  ) {
    if (!req.user?.id) throw new UnauthorizedException('User not authenticated.');
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.milestonesService.findAll(projectId, userId, userRole);
  }

  // --- Get single milestone ---
  @Get(':milestoneId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  findOne(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.id) throw new UnauthorizedException('User not authenticated.');
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.milestonesService.findOne(milestoneId, userId, userRole);
  }

  // --- Update milestone with nested tasks ---
  @Patch(':milestoneId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  update(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
    @Req() req: RequestWithUser,
  ) {
    if (!req.user?.id) throw new UnauthorizedException('User not authenticated.');
    const mentorId = req.user.id;
    return this.milestonesService.update(milestoneId, updateMilestoneDto, mentorId);
  }

  // --- Delete milestone ---
  @Delete(':milestoneId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    if (!req.user?.id) throw new UnauthorizedException('User not authenticated.');
    const mentorId = req.user.id;
    await this.milestonesService.remove(milestoneId, mentorId);
  }
}
