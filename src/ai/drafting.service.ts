import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import OpenAI from 'openai';
import { AnalyticsService } from '../analytics/analytics.service';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Injectable()

export class DraftingService {
  private readonly logger = new Logger(DraftingService.name);
  private readonly openai: OpenAI | undefined ;
  private readonly USE_AI_MOCKS: boolean;
  googleAI: any;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
  ) {
  const useMocks = this.configService.get<boolean>('USE_AI_MOCKS', false);
 const provider = this.configService.get<string>('AI_PROVIDER');
  this.USE_AI_MOCKS = this.configService.get<boolean>('USE_AI_MOCKS', false);
  const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');

  if (provider === 'OPENAI' && !this.USE_AI_MOCKS) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.logger.log(`[DraftingService] Initialized OpenAI provider ✅`);
  } else if (provider === 'GOOGLE' && !this.USE_AI_MOCKS) {
   this.openai = new OpenAI({
  apiKey: this.configService.get<string>('OPENAI_API_KEY')!,
});
this.logger.log(`[AI Setup] Provider: ${this.configService.get('AI_PROVIDER')}, UseMocks: ${this.USE_AI_MOCKS}, OpenAI Key: ${openaiApiKey ? '✅ loaded' : '❌ missing'}`);

  if (openaiApiKey && !this.USE_AI_MOCKS) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  } else {
    this.logger.warn('[DraftingService] Using mock AI responses.');
  }
  }
}
  async generateAiDraft(internId: string, mentorId: string): Promise<{ draft: string }> {
    this.logger.log(`[DraftingService] Generating AI draft for intern ${internId}`);

    // 🧩 Fetch users
    const intern = await this.usersService.findOne(internId);
    const mentor = await this.usersService.findOne(mentorId);

    if (!intern || intern.role !== UserRole.INTERN)
      throw new NotFoundException(`Intern with ID "${internId}" not found or invalid role.`);
    if (!mentor || mentor.role !== UserRole.MENTOR)
      throw new NotFoundException(`Mentor with ID "${mentorId}" not found or invalid role.`);

    // 🧠 Fetch analytics
    const internInsights = await this.analyticsService.getInternInsights(internId);
    const githubData = internInsights.github || {};
    const nlpData = internInsights.nlp || {};
    const taskData = internInsights.tasks || {};

    const totalCommits = githubData.totalCommits ?? 0;
    const totalAdditions = githubData.totalAdditions ?? 0;
    const totalDeletions = githubData.totalDeletions ?? 0;
    const taskCompletionRate = taskData?.completionRate
      ? taskData.completionRate.toFixed(0)
      : '0';

    const sentiment =
      nlpData?.sentimentScore && nlpData.sentimentScore !== 'N/A'
        ? nlpData.sentimentScore
        : 'Neutral';

    const keyThemes =
      Array.isArray(nlpData.keyThemes) && nlpData.keyThemes.length > 0
        ? nlpData.keyThemes.join(', ')
        : 'No specific themes identified.';

    // 🧩 Graceful zero-data summary
    const hasActivity =
      totalCommits > 0 || totalAdditions > 0 || totalDeletions > 0 || taskCompletionRate !== '0';

    const performanceSummary = hasActivity
      ? `${intern.firstName} has made ${totalCommits} commits, with ${taskCompletionRate}% task completion. 
        The overall feedback sentiment is ${sentiment}.`
      : `${intern.firstName} has recently joined and is beginning to familiarize themselves with the workflow. 
        Their mentor anticipates strong future contributions as they get more involved.`;

    // 🧠 AI Prompt
    const prompt = `
Write a professional intern performance review for ${intern.firstName} ${intern.lastName}, based on the following data:
- Total commits: ${totalCommits}
- Additions: ${totalAdditions}
- Deletions: ${totalDeletions}
- Task completion: ${taskCompletionRate}%
- Sentiment: ${sentiment}
- Key themes: ${keyThemes}

Summary context:
${performanceSummary}

Tone: Supportive, encouraging, and written from a mentor's perspective.
Length: 200–300 words.
    `;

    this.logger.debug('[DraftingService] Prompt prepared:', prompt);

    // 🧩 Mock Fallback (no AI key)
    if (!this.openai || this.USE_AI_MOCKS) {
      const mockDraft = `
Dear ${intern.firstName},

This is your AI-generated performance summary. You've made ${totalCommits} commits, showing a ${taskCompletionRate}% task completion rate.
Your current progress reflects steady engagement and potential for continued growth.

Keep up the positive attitude and collaborative spirit — your contributions will soon reflect in tangible results!

Best regards,  
${mentor.firstName} ${mentor.lastName}
      `;
      return { draft: mockDraft };
    }

    // 🧠 Actual OpenAI call
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional mentor writing a detailed and positive performance review for an intern.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });

      const text = response.choices?.[0]?.message?.content || '[No AI response generated]';
      return { draft: text };
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.error('[DraftingService] AI draft generation failed:', message);
      throw new InternalServerErrorException(`AI Draft Generation failed: ${message}`);
    }
  }
}
