import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Get,
  UnauthorizedException,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { EvaluationsService } from './evaluations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { EvaluationType } from './entities/evaluation.entity';
import { Public } from '../auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  /**
   * 1️⃣ Create Evaluation (Mentor or Self Review)
   */
  @Post()
  @Roles(UserRole.MENTOR, UserRole.INTERN)
  @HttpCode(HttpStatus.CREATED)
  async createEvaluation(
    @Body() dto: CreateEvaluationDto,
    @Req() req: RequestWithUser,
  ) {
    const submitterId = req.user.id;

    if (dto.type === EvaluationType.SELF && submitterId !== dto.internId) {
      throw new UnauthorizedException(
        'You can only submit a self-review for yourself.',
      );
    }

    if (dto.type !== EvaluationType.SELF && req.user.role !== UserRole.MENTOR) {
      throw new UnauthorizedException(
        'Only mentors can submit this type of evaluation.',
      );
    }

    return this.evaluationsService.createEvaluation(dto, submitterId);
  }

  /**
   * 2️⃣ Get All Evaluations (HR or Mentor View)
   */
  @Get()
  @Roles(UserRole.HR, UserRole.MENTOR)
  async findAll(
    @Req() req: RequestWithUser,
    @Query('internId') queryInternId?: string,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.evaluationsService.findAll(userId, userRole, queryInternId);
  }

  /**
   * 3️⃣ Get All Evaluations for a Specific Intern
   *    (Public safe – used in analytics)
   */
  @Get('intern/:internId')
  @Public()
  async getInternEvaluations(
    @Param('internId', ParseUUIDPipe) internId: string,
    @Req() req?: RequestWithUser,
  ) {
    return this.evaluationsService.getEvaluationsForIntern(
      internId,
      req?.user?.id || '',
      req?.user?.role || UserRole.USER,
    );
  }

  /**
   * 4️⃣ Generate AI Draft Review for an Intern (Mentor/HR)
   */
  @Post('draft-review/:internId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  @HttpCode(HttpStatus.OK)
  async generateReviewDraft(
    @Param('internId', ParseUUIDPipe) internId: string,
    @Req() req: RequestWithUser,
  ) {
    const requesterRole = req.user.role;
    const mentorId = req.user.id;

    // Optional: HR can also request AI drafts for any intern
    if (requesterRole === UserRole.MENTOR) {
      // Mentor validation handled in service (project assignment check)
      return this.evaluationsService.generateAiDraft(internId, mentorId);
    }

    if (requesterRole === UserRole.HR) {
      // HR bypasses project validation
      return this.evaluationsService.generateAiDraft(internId, mentorId);
    }

    throw new ForbiddenException(
      'Only mentors or HR staff can generate AI drafts.',
    );
  }
}
