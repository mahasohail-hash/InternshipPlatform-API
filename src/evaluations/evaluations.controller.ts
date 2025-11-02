import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('api/evaluations') // This path MUST match your frontend's call
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @Roles(UserRole.MENTOR)
  create(
    @Body() createEvaluationDto: CreateEvaluationDto,
    @Request() req: RequestWithUser,
  ) {
    const mentorId = String(req.user.id);
    return this.evaluationsService.create(createEvaluationDto, mentorId);
  }

@Get() 
@Roles(UserRole.HR, UserRole.MENTOR)
async findAllEvaluations(
  @CurrentUser() user: { id: string, role: UserRole }) {
    // Check for user existence defensively
    if (!user) {
        throw new UnauthorizedException('Authentication required.');
    }
    
    
    // This allows the service to apply the correct RBAC filter (HR sees all, Interns/Mentors see restricted data)
    return this.evaluationsService.findAll(user.id, user.role); 
}

  
  
  
  @Post('generate-draft/:internId')
  @Roles(UserRole.MENTOR)
  generateDraft(@Param('internId') internId: string) {
    
    return this.evaluationsService.generateAiDraft(+internId);
  }

  @Get('intern/:internId')
  @Roles(UserRole.INTERN, UserRole.MENTOR, UserRole.HR)
  getInternEvaluations(
    @Param('internId') internId: string,
    @Request() req: RequestWithUser,
  ) {
    if (req.user.role === UserRole.INTERN && String(req.user.id) !== internId) {
      throw new UnauthorizedException('You can only view your own evaluations.');
    }
    
    return this.evaluationsService.getEvaluationsForIntern(internId);
  }
}