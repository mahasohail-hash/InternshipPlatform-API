import { Controller, Post, Body, Req, UseGuards, Param, ParseUUIDPipe, HttpCode, HttpStatus, Get, UnauthorizedException, ForbiddenException, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { EvaluationsService } from "./evaluations.service"; // CRITICAL FIX: Standard import
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { EvaluationType } from "./entities/evaluation.entity"; // CRITICAL FIX: Standard import
import { Public } from '../auth/decorators/public.decorator'; // CRITICAL FIX: Standard import for Public
@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards globally to the controller
@Controller('evaluations')
export class EvaluationsController {
    constructor(private readonly evaluationsService: EvaluationsService) {}

    // 1. POST /api/evaluations - Create an Evaluation
    @Post()
    @Roles(UserRole.MENTOR, UserRole.INTERN) // Mentors submit all types; Interns submit Self-Review
    @HttpCode(HttpStatus.CREATED)
    async createEvaluation(@Body() dto: CreateEvaluationDto, @Req() req: RequestWithUser) { // CRITICAL FIX: Type req
        const submitterId = req.user.id; // User who is logged in and submitting

        // If it's a self-review, ensure the submitter is the intern being reviewed
        if (dto.type === EvaluationType.SELF && submitterId !== dto.internId) {
            throw new UnauthorizedException('You can only submit a self-review for yourself.');
        }

        // If it's a mentor-submitted review, ensure the submitter is a mentor
        if (dto.type !== EvaluationType.SELF && req.user.role !== UserRole.MENTOR) {
            throw new UnauthorizedException('Only mentors can submit this type of evaluation.');
        }

        return this.evaluationsService.createEvaluation(dto, submitterId);
    }

    // 2. GET /api/evaluations - Find All Evaluations (for HR/Mentor overview, with filtering)
    @Get()
    @Roles(UserRole.HR, UserRole.MENTOR)
    async findAll(@Req() req: RequestWithUser, @Query('internId') queryInternId?: string) { // Add query for specific intern
        const userId = req.user.id;
        const userRole = req.user.role;

        // If a queryInternId is provided, and the user is a Mentor, ensure it's one of their interns (or they're HR)
        // This logic can be further refined in the service if you store mentor-intern assignments
        return this.evaluationsService.findAll(userId, userRole, queryInternId);
    }

    // 3. GET /api/evaluations/intern/:internId - Get specific Intern's Evaluations
      @Get('intern/:internId') // Full path: /api/evaluations/intern/:internId
  @Public()
      //@Roles(UserRole.HR, UserRole.MENTOR, UserRole.INTERN)
  async getInternEvaluations(@Param('internId', ParseUUIDPipe) internId: string, @Req() req?: RequestWithUser) { // req is now optional
    return this.evaluationsService.getEvaluationsForIntern(internId, req?.user?.id || '', req?.user?.role || UserRole.USER); // Pass defaults if no user
  }
    // 4. POST /api/evaluations/draft-review/:internId - Generate AI Draft (4.7)
    @Post('draft-review/:internId')
    @Roles(UserRole.MENTOR)
    async generateReviewDraft(@Param('internId', ParseUUIDPipe) internId: string, @Req() req: RequestWithUser) {
        const mentorId = req.user.id;
        // The service will handle verifying if this mentor is assigned to the intern's project etc.
        return this.evaluationsService.generateAiDraft(internId, mentorId);
    }
}