import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere ,FindManyOptions} from 'typeorm';
import { EvaluationType } from './entities/evaluation.entity'; // Entity must have 'feedbackText' and 'id'
import { CreateEvaluationDto } from './dto/create-evaluation.dto'; // Expects number 'internId', string 'comments'
import { UsersService } from '../users/users.service'; // Assumes findOne expects string UUID for User ID
import { User } from '../users/entities/users.entity'; // Assuming User entity has string 'id'
import { Repository } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { UserRole } from '../common/enums/user-role.enum';
// --- Mock Service Definitions ---
// These need to exist and be provided in evaluations.module.ts
@Injectable()
export class GithubIntegrationService {
  // Mock expects number internId
  async getContributionMetrics(internId: number): Promise<{ commits: number; linesChanged: number; pullRequests: number }> {
    console.log(`[Mock Github] Getting metrics for intern ID (number): ${internId}`);
    if (typeof internId !== 'number' || isNaN(internId)) {
        console.error("[Mock Github] Received invalid internId:", internId);
        return { commits: 0, linesChanged: 0, pullRequests: 0 };
    }
    const commits = Math.floor(Math.random() * 40) + 10;
    const linesChanged = commits * (Math.floor(Math.random() * 50) + 10);
    const pullRequests = Math.floor(commits / 5);
    return { commits, linesChanged, pullRequests };
  }
}
@Injectable()
export class NlpService {
  async summarizeFeedback(feedbackTexts: string[]): Promise<{ sentiment: string; themes: string[] }> {
    console.log(`[Mock NLP] Analyzing ${feedbackTexts.length} feedback notes...`);
    if (feedbackTexts.length === 0) return { sentiment: 'neutral', themes: ['no feedback'] };
    // Simplified logic
    const positiveWords = ['great', 'excellent', 'good', 'fast', 'creative'];
    const negativeWords = ['slow', 'struggled', 'bug', 'error', 'issue'];
    const fullText = feedbackTexts.join(' ').toLowerCase();
    let score = 0;
    positiveWords.forEach(w => { if (fullText.includes(w)) score++; });
    negativeWords.forEach(w => { if (fullText.includes(w)) score--; });
    const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
    const themes = ['mock theme 1', 'mock theme 2']; // Keep mock simple
    return { sentiment, themes };
   }
}
@Injectable()
export class LlmService {
  async generateReview(prompt: string): Promise<string> {
    console.log('[Mock LLM] Generating review...');
    // Simple mock based on prompt content
    return `AI MOCK DRAFT:\nIntern shows potential. Based on ${prompt.includes('positive') ? 'positive' : 'mixed'} feedback and metrics.\n(Themes: ${prompt.split('Themes: ')[1]?.split('\n')[0] || 'N/A'})`;
  }
}
// ------------------------------

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    private readonly usersService: UsersService,
    private readonly githubService: GithubIntegrationService,
    private readonly nlpService: NlpService,
    private readonly llmService: LlmService,
  ) {}

  // Expects mentorId string (UUID), DTO has number internId
  async create(createEvaluationDto: CreateEvaluationDto, mentorId: string): Promise<Evaluation> {
    console.log('[Service Create] Received DTO:', createEvaluationDto);
    let mentor: User | null;
    let intern: User | null;

    try {
      mentor = await this.usersService.findOne(mentorId); // Find mentor by UUID string
      if (!mentor) throw new NotFoundException(`Mentor with ID "${mentorId}" not found.`);

      // Convert number internId from DTO to string for findOne (assuming User ID is UUID)
      intern = await this.usersService.findOne(String(createEvaluationDto.internId));
      if (!intern) throw new NotFoundException(`Intern with ID "${createEvaluationDto.internId}" not found.`);

    } catch (error) {
       console.error('[Service Create] Error finding user:', error);
       if (error instanceof NotFoundException) throw error;
       throw new InternalServerErrorException('Error retrieving user details.');
    }

    try {
      // Create evaluation using entity field 'feedbackText', mapped from DTO 'comments'
      const newEvaluation = this.evaluationRepository.create({
        type: createEvaluationDto.type,
        score: createEvaluationDto.score,
feedbackText: createEvaluationDto.feedbackText, // Use the actual DTO field name        mentor: mentor,
        intern: intern,
      });
      console.log('[Service Create] Saving evaluation for intern:', intern.id);
      return await this.evaluationRepository.save(newEvaluation);

    } catch (error) {
        console.error('[Service Create] Error saving evaluation to DB:', error);
        throw new InternalServerErrorException('Database error while saving evaluation.');
    }
  }

async findAll(userId: string, userRole: UserRole): Promise<Evaluation[]> {
    const findOptions: FindManyOptions<Evaluation> = {
        relations: ['intern', 'mentor'], 
    };
console.log(`[DEBUG] Attempting UNFILTERED fetch for ${userRole} (${userId})`);

    if (userRole === UserRole.INTERN) {
        // Interns should only see evaluations they are part of
        findOptions.where = [
            { intern: { id: userId } },
            { mentor: { id: userId } }, // If they did a self-review/mentee review
        ];
    } else if (userRole === UserRole.MENTOR) {
        // Mentors should only see evaluations they created or are linked to
        findOptions.where = { mentor: { id: userId } };
    } 
    
    // The query should return ALL evaluations for HR users.
    return this.evaluationRepository.find(findOptions);
}



  // Expects internId as number
  async generateAiDraft(internId: number): Promise<{ draft: string }> {
    console.log(`[Service GenerateDraft] Received intern ID (number): ${internId}`);
    if (typeof internId !== 'number' || isNaN(internId)) {
        console.error('[Service GenerateDraft] Invalid internId type received:', typeof internId);
        throw new InternalServerErrorException('Invalid intern ID format for generating draft.');
    }

    let intern: User | null;
    try {
      // Convert number internId to string for findOne (assuming User ID is UUID)
      intern = await this.usersService.findOne(String(internId));
      if (!intern) throw new NotFoundException(`Intern with ID "${internId}" not found.`);
      console.log(`[Service GenerateDraft] Found intern: ${intern.firstName}`);

    } catch (error) {
       console.error(`[Service GenerateDraft] Error fetching intern ${internId}:`, error);
       if (error instanceof NotFoundException) throw error;
       throw new InternalServerErrorException('Error fetching intern details for draft.');
    }

    let existingEvals: Evaluation[] = [];
    try {
      // Use string UUID for relation query
      const whereClause: FindOptionsWhere<Evaluation> = {
          intern: { id: String(internId) },
          type: EvaluationType.WEEKLY,
      };
      existingEvals = await this.evaluationRepository.find({
        where: whereClause,
        select: ['feedbackText'], // Ensure Evaluation entity has 'feedbackText'
        order: { id: 'DESC' }, // Order by ID if no createdAt
        take: 10, // Limit number of evals to process
      });
      console.log(`[Service GenerateDraft] Found ${existingEvals.length} previous weekly evaluations.`);

    } catch (error) {
       console.error(`[Service GenerateDraft] Error fetching existing evaluations for intern ${internId}:`, error);
       throw new InternalServerErrorException('Error fetching previous evaluations for draft.');
    }

    // Use correct field name from entity
    const feedbackTexts = existingEvals.map(e => e.feedbackText);

    try {
      // Pass number ID to mock service
      const githubMetrics = await this.githubService.getContributionMetrics(internId);
      const feedbackSummary = await this.nlpService.summarizeFeedback(feedbackTexts);

      const prompt = `
        Draft review for: ${intern.firstName} ${intern.lastName} (ID: ${internId}).
        GitHub Metrics: ${githubMetrics.commits} commits, ${githubMetrics.linesChanged} lines changed, ${githubMetrics.pullRequests} PRs.
        Summary based on ${feedbackTexts.length} weekly notes:
        Sentiment: ${feedbackSummary.sentiment}. Key Themes: ${feedbackSummary.themes.join(', ')}.
      `;
      console.log(`[Service GenerateDraft] Generated prompt for LLM.`);

      const draftText = await this.llmService.generateReview(prompt);
      console.log(`[Service GenerateDraft] Received draft from LLM successfully.`);
      return { draft: draftText };

    } catch (error) {
       console.error(`[Service GenerateDraft] Error during AI draft external service calls for intern ${internId}:`, error);
       throw new InternalServerErrorException('Error during AI draft generation process.');
    }
  }

  // Expects internId as number
  async getEvaluationsForIntern(internId: string): Promise<Evaluation[]> {
    console.log(`[Service GetEvals] Received intern ID (number): ${internId}`);
    // Convert number internId to string for findOne (assuming User ID is UUID)
    const intern = await this.usersService.findOne(String(internId));
    if (!intern) throw new NotFoundException(`Intern with ID "${internId}" not found.`);

    try {
      // Use string UUID for relation query
      const whereClause: FindOptionsWhere<Evaluation> = {
          intern: { id: String(internId) }
      };
      console.log(`[Service GetEvals] Fetching evaluations for intern ID: ${intern.id}`);
      return this.evaluationRepository.find({
      where: { intern: { id: internId } },
      relations: ['mentors'],               
      order: { createdAt: 'DESC' },     
    });
    } catch (error) {
      console.error(`[Service GetEvals] Error fetching evaluations for intern ${internId}:`, error);
      throw new InternalServerErrorException('Error fetching evaluations from database.');
    }
  }

}