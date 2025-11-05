import { Injectable, NotFoundException, InternalServerErrorException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions, In } from 'typeorm'; // CRITICAL FIX: Import In
import { User } from '../users/entities/users.entity';
import { Evaluation, EvaluationType } from './entities/evaluation.entity';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GithubService } from '../github/github.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class EvaluationsService {
   private readonly genAI: GoogleGenerativeAI | undefined;
   private readonly LLM_MODEL: string = 'gemini-pro';
   private readonly USE_AI_MOCKS: boolean;

  constructor(
    @InjectRepository(Evaluation) private evaluationRepository: Repository<Evaluation>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly githubService: GithubService,
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
  ) {
    const googleApiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    this.USE_AI_MOCKS = this.configService.get<boolean>('USE_AI_MOCKS', false);

    if (googleApiKey && !this.USE_AI_MOCKS) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
    } else {
      console.warn("WARNING: Google AI API Key not configured or USE_AI_MOCKS is true. AI drafting will return mock data.");
      this.genAI = undefined;
    }
  }

  async createEvaluation(dto: CreateEvaluationDto, submitterId: string): Promise<Evaluation> {
    console.log('[EvaluationsService] Received DTO:', dto);
    const isSelfReview = dto.type === EvaluationType.SELF;

    const intern = await this.userRepository.findOneBy({ id: dto.internId });
    if (!intern) throw new NotFoundException(`Intern with ID "${dto.internId}" not found.`);

    let mentor: User | null | undefined;
    if (!isSelfReview) {
        mentor = await this.userRepository.findOneBy({ id: submitterId, role: UserRole.MENTOR });
        if (!mentor) {
            throw new UnauthorizedException('Only a mentor can submit this type of evaluation.');
        }
        const isMentorForIntern = await this.projectsService.isMentorAssignedToIntern(mentor.id, intern.id);
        if (!isMentorForIntern) {
            throw new ForbiddenException('You are not authorized to submit evaluations for this intern.');
        }
    } else {
         if (submitterId !== intern.id) {
             throw new UnauthorizedException('You can only submit a self-review for yourself.');
         }
        mentor = undefined;
    }

    const newEvaluation = this.evaluationRepository.create({
        score: dto.score,
        feedbackText: dto.feedbackText,
        type: dto.type,
        intern: intern,
        internId: intern.id,
        mentor: mentor,
        mentorId: mentor ? mentor.id : undefined,
    });
    console.log('[EvaluationsService] Saving evaluation for intern:', intern.id);
    return this.evaluationRepository.save(newEvaluation);
  }

  async findAll(userId: string, userRole: UserRole, queryInternId?: string): Promise<Evaluation[]> {
    const findOptions: FindManyOptions<Evaluation> = {
        relations: ['intern', 'mentor'],
        order: { createdAt: 'DESC' }
    };

    if (userRole === UserRole.INTERN) {
        findOptions.where = { intern: { id: userId } };
    } else if (userRole === UserRole.MENTOR) {
        const mentoredInterns = await this.projectsService.getMentoredInternsIds(userId);
        if (mentoredInterns.length === 0) return [];

        // CRITICAL FIX: Use 'In' operator correctly for OR condition
        findOptions.where = [
            { mentor: { id: userId } }, // Evaluations submitted by this mentor
            { intern: { id: In(mentoredInterns) }, type: EvaluationType.SELF } // Self-reviews of their interns
        ];

        if (queryInternId) {
            if (!mentoredInterns.includes(queryInternId)) {
                throw new ForbiddenException('You are not authorized to view evaluations for this intern.');
            }
            // If querying a specific intern, narrow down the conditions
            findOptions.where = [
                { mentor: { id: userId }, intern: { id: queryInternId } },
                { intern: { id: queryInternId }, type: EvaluationType.SELF }
            ];
        }
    } else if (userRole === UserRole.HR) {
        if (queryInternId) {
            findOptions.where = { intern: { id: queryInternId } };
        }
    } else {
        return [];
    }

    return this.evaluationRepository.find(findOptions);
  }

  async generateAiDraft(internId: string, mentorId: string): Promise<{ draft: string }> {
    console.log(`[EvaluationsService GenerateDraft] Intern ID: ${internId} by mentor: ${mentorId}`);

    const intern = await this.userRepository.findOneBy({ id: internId, role: UserRole.INTERN });
    const mentor = await this.userRepository.findOneBy({ id: mentorId, role: UserRole.MENTOR });

    if (!intern) throw new NotFoundException(`Intern with ID "${internId}" not found or is not an INTERN.`);
    if (!mentor) throw new NotFoundException(`Mentor with ID "${mentorId}" not found or is not a MENTOR.`);

    const isMentorForIntern = await this.projectsService.isMentorAssignedToIntern(mentor.id, intern.id);
    if (!isMentorForIntern) {
        throw new ForbiddenException('You are not authorized to generate drafts for this intern.');
    }

    const internInsights = await this.analyticsService.getInternInsights(internId);

    const githubData = internInsights.github;
    const nlpData = internInsights.nlp;
    const taskData = internInsights.tasks;

    const totalCommits = githubData?.totalCommits || 0;
    const totalAdditions = githubData?.totalAdditions || 0;
    const totalDeletions = githubData?.totalDeletions || 0;
    const taskCompletionRate = taskData?.completionRate?.toFixed(0) || '0';
    const sentiment = nlpData?.sentimentScore || "Neutral";
    const keyThemes = nlpData?.keyThemes?.join(', ') || "No specific themes identified.";

    const prompt = `
      You are an experienced HR professional drafting a performance review for an intern.
      Draft a ${EvaluationType.MIDPOINT} review for intern ${intern.firstName} ${intern.lastName}.
      This intern is mentored by ${mentor.firstName} ${mentor.lastName}.

      **Instructions for Review Draft:**
      - **Tone:** Professional, encouraging, constructive.
      - **Structure:** Start with a brief introduction, then cover strengths, areas for growth, and future recommendations. Conclude with an positive outlook statement.
      - **Word Count:** Keep it concise, around 200-300 words.
      - **Focus:** Highlight contributions and identify specific areas for improvement based on provided metrics.

      **Intern Data & Performance Metrics:**
      - Intern Name: ${intern.firstName} ${intern.lastName}
      - Total commits in monitored GitHub repositories: ${totalCommits}
      - Total lines added in code: ${totalAdditions}
      - Total lines deleted in code: ${totalDeletions}
      - Overall task completion rate: ${taskCompletionRate}%
      - Aggregated sentiment from previous feedback: ${sentiment}
      - Key thematic areas from previous feedback: ${keyThemes}

      Generate the draft review text.
    `;

    console.log("[EvaluationsService GenerateDraft] Generated Prompt:\n", prompt);

    if (!this.genAI || this.USE_AI_MOCKS) {
        console.warn("MOCK AI DRAFT: Returning a mock draft.");
        const mockResponse = `
        [AI Generated Draft - MOCK]
        Dear ${intern.firstName},

        This is your ${EvaluationType.MIDPOINT} review, reflecting on your performance as an intern.

        **Strengths:**
        Your proactive engagement is commendable. GitHub records show approximately ${totalCommits} commits, with ${totalAdditions} lines added and ${totalDeletions} lines deleted, indicating active contribution to our codebase. Your task completion rate is ${taskCompletionRate}%, which is a strong indicator of your reliability and ability to meet deadlines. Feedback highlights a generally ${sentiment} sentiment, with themes such as ${keyThemes}.

        **Areas for Growth:**
        Consider exploring deeper into project architecture to understand the broader impact of your code. Proactively seeking feedback on code quality and best practices could also accelerate your growth.

        **Recommendations:**
        Continue to build on your technical skills by taking on new challenges. We encourage you to engage more in team discussions and leverage mentorship opportunities to further develop your professional communication.

        We look forward to your continued growth.

        Best regards,
        ${mentor.firstName} ${mentor.lastName}
        `;
        return { draft: mockResponse };
    }

    try {
        const model = this.genAI.getGenerativeModel({ model: this.LLM_MODEL });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return { draft: text };

    } catch (llmError: any) {
        console.error("[LLM ERROR] Failed to generate AI draft:", llmError.message || llmError);
        throw new InternalServerErrorException(`AI draft generation failed. ${llmError.message}`);
    }
  }

  async getEvaluationsForIntern(internId: string, requesterId: string, requesterRole: UserRole): Promise<Evaluation[]> {
    const intern = await this.userRepository.findOneBy({ id: internId, role: UserRole.INTERN });
    if (!intern) throw new NotFoundException(`Intern with ID "${internId}" not found or is not an INTERN.`);

    if (requesterRole === UserRole.MENTOR) {
        const isMentorForIntern = await this.projectsService.isMentorAssignedToIntern(requesterId, internId);
        if (!isMentorForIntern) {
            throw new ForbiddenException('You are not authorized to view evaluations for this intern.');
        }
    }

    try {
      const whereClause: FindOptionsWhere<Evaluation> = {
          intern: { id: internId }
      };
      return this.evaluationRepository.find({
        where: whereClause,
        relations: ['intern', 'mentor'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error(`[EvaluationsService] Error fetching evaluations for intern ${internId}:`, error);
      throw new InternalServerErrorException('Error fetching evaluations from database.');
    }
  }
}