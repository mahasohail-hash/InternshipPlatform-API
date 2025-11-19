import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, In } from 'typeorm';
import { Evaluation, EvaluationType } from './entities/evaluation.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { User } from '../users/entities/users.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { ProjectsService } from '../projects/projects.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { Project } from '@/projects/entities/project.entity';
import { DraftingService } from '@/ai/drafting.service';

@Injectable()
export class EvaluationsService {

  private readonly genAI: GoogleGenerativeAI | undefined;
  private readonly LLM_MODEL = 'gemini-pro';
  private readonly USE_AI_MOCKS: boolean;

constructor(
  @InjectRepository(Evaluation)
  private readonly evaluationRepository: Repository<Evaluation>,

  @InjectRepository(User)
  private readonly userRepository: Repository<User>,

  private readonly draftingService: DraftingService,

  @InjectRepository(Project)
  private readonly projectRepository: Repository<Project>, // 👈 INDEX [3]
  
  private readonly projectsService: ProjectsService,
  private readonly analyticsService: AnalyticsService,
  private readonly configService: ConfigService,
)  {
    const googleApiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    this.USE_AI_MOCKS = this.configService.get<boolean>('USE_AI_MOCKS', false);
    this.genAI =
      googleApiKey && !this.USE_AI_MOCKS
        ? new GoogleGenerativeAI(googleApiKey)
        : undefined;
  }

  // ✅ 1. createEvaluation
  async createEvaluation(dto: CreateEvaluationDto, submitterId: string) {
    const intern = await this.userRepository.findOneBy({
      id: dto.internId,
      role: UserRole.INTERN,
    });
    if (!intern) throw new NotFoundException('Intern not found');

    let mentor: User | null = null;
    if (dto.type !== EvaluationType.SELF) {
      mentor = await this.userRepository.findOneBy({
        id: submitterId,
        role: UserRole.MENTOR,
      });
      if (!mentor)
        throw new UnauthorizedException('Only mentors can create evaluations');

      const isMentorForIntern = await this.projectsService.isMentorAssignedToIntern(
        mentor.id,
        intern.id,
      );
      if (!isMentorForIntern)
        throw new ForbiddenException('You are not mentor of this intern');
    }

   const evaluation = this.evaluationRepository.create({
  feedbackText: dto.feedbackText,
  type: dto.type,
  intern,
  internId: intern.id,
  mentor: mentor ?? undefined,
  mentorId: mentor?.id,
});

    return this.evaluationRepository.save(evaluation);
  }

  // ✅ 2. findAll
  async findAll(userId: string, role: UserRole, internId?: string) {
    const options: FindManyOptions<Evaluation> = {
      relations: ['intern', 'mentor'],
      order: { createdAt: 'DESC' },
    };

    if (role === UserRole.INTERN) {
      options.where = { intern: { id: userId } };
    } else if (role === UserRole.MENTOR) {
      // Get mentored intern ids
      const mentoredInternIds = await this.projectsService.getMentoredInternsIds(userId);

      if (internId && !mentoredInternIds.includes(internId)) {
        throw new ForbiddenException('Not your intern');
      }

      if (internId) {
        options.where = [{ intern: { id: internId } }, { mentor: { id: userId } }];
      } else {
        options.where = [
          { mentor: { id: userId } },
          { intern: { id: In(mentoredInternIds) }, type: EvaluationType.SELF },
        ];
      }
    } else if (role === UserRole.HR) {
      // HR can filter by intern
      if (internId) options.where = { intern: { id: internId } };
    } else {
      // other roles: forbid
      throw new ForbiddenException('Not authorized to view evaluations');
    }

    return this.evaluationRepository.find(options);
  }

  // ✅ 3. getEvaluationsForIntern
 async getEvaluationsForIntern(
  internId: string,
  requesterId: string,
  requesterRole: UserRole,
) {
  // HR → unrestricted
  if (requesterRole === UserRole.HR) {
    return this.evaluationRepository.find({
      where: { intern: { id: internId } },
      relations: ['mentor', 'intern'],
      order: { createdAt: 'DESC' },
    });
  }

  // Intern → can only view their own evaluations
  if (requesterRole === UserRole.INTERN) {
    if (requesterId !== internId) {
      throw new ForbiddenException('You cannot view evaluations of another intern');
    }

    return this.evaluationRepository.find({
      where: { intern: { id: internId } },
      relations: ['mentor', 'intern'],
      order: { createdAt: 'DESC' },
    });
  }

  // Mentor → 🔥 allowed to view ANY intern (your requirement)
  if (requesterRole === UserRole.MENTOR) {
    return this.evaluationRepository.find({
      where: { intern: { id: internId } },
      relations: ['mentor', 'intern'],
      order: { createdAt: 'DESC' },
    });
  }

  // Everyone else blocked
  throw new ForbiddenException('You are not allowed to view evaluations');
}



  // ✅ 4. generateAiDraft
  async generateAiDraft(internId: string, mentorId: string) {
    const intern = await this.userRepository.findOne({
      where: { id: internId, role: UserRole.INTERN },
    });
    const mentor = await this.userRepository.findOne({
      where: { id: mentorId, role: UserRole.MENTOR },
    });

    if (!intern || !mentor)
      throw new NotFoundException('Intern or mentor not found');

    // Ensure mentor is assigned to intern (safety)
    const isMentorAssigned = await this.projectsService.isMentorAssignedToIntern(
      mentorId,
      internId,
    );
    if (!isMentorAssigned) throw new ForbiddenException('Mentor is not assigned to this intern');

    const insights = await this.analyticsService.getInternInsights(internId);
    const { github, nlp, tasks } = insights || {};

    const prompt = `
You are an HR reviewer writing a ${EvaluationType.MIDPOINT} review for ${intern.firstName} ${intern.lastName}.
Mentor: ${mentor.firstName} ${mentor.lastName}.
Commits: ${github?.totalCommits ?? 0}, Additions: ${github?.totalAdditions ?? 0}, Deletions: ${github?.totalDeletions ?? 0}
Tasks Completed: ${tasks?.completionRate ?? 0}%
Sentiment: ${nlp?.sentimentScore ?? 'Neutral'}
Themes: ${nlp?.keyThemes?.join(', ') ?? 'No themes.'}
`;

    // If AI not configured or using mock, return a deterministic mock
    if (!this.genAI || this.USE_AI_MOCKS) {
      return {
        draft: `Dear ${intern.firstName}, this is a mock performance draft generated for testing. Key themes: ${(nlp?.keyThemes || []).slice(0,3).join(', ')}`,
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.LLM_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return { draft: response.text() };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      throw new InternalServerErrorException('AI Draft Generation failed: ' + errorMessage);
    }
  }
  async getInternEvaluations(internId: string) {
    return this.evaluationRepository.find({
      where: { intern: { id: internId } },
      relations: ['mentor', 'intern'],
      order: { createdAt: 'DESC' },
    });
  }
}
    
 