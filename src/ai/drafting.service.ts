import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai'; // CRITICAL FIX: Import GoogleGenerativeAI
import { GithubService } from '../github/github.service';
import { UsersService } from '../users/users.service';
import { EvaluationType } from '../evaluations/entities/evaluation.entity'; // Import EvaluationType for consistent drafting
import { TaskStatus } from '../projects/entities/task.entity'; // Import TaskStatus
import { AnalyticsService } from '../analytics/analytics.service'; // CRITICAL FIX: Use AnalyticsService for gathering insights

@Injectable()
export class DraftingService {
  private readonly genAI: GoogleGenerativeAI | undefined;
  private readonly LLM_MODEL: string = 'gemini-pro'; // Recommended model for general text generation
  private readonly USE_AI_MOCKS: boolean; // Flag to control mock usage

  constructor(
    private configService: ConfigService,
    private githubService: GithubService,
    private usersService: UsersService,
    private analyticsService: AnalyticsService, // CRITICAL FIX: Inject AnalyticsService
  ) {
    const googleApiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    this.USE_AI_MOCKS = this.configService.get<boolean>('USE_AI_MOCKS', false); // Default to false

    if (googleApiKey && !this.USE_AI_MOCKS) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
    } else {
      console.warn("WARNING: Google AI API Key not configured or USE_AI_MOCKS is true. AI Drafting will return mock data.");
      this.genAI = undefined; // Explicitly set to undefined if not initialized
    }
  }

  async generatePerformanceReviewDraft(internId: string, mentorId: string): Promise<string> {
    const intern = await this.usersService.findOne(internId);
    const mentor = await this.usersService.findOne(mentorId);

    if (!intern) {
      throw new NotFoundException(`Intern with ID ${internId} not found.`);
    }
    if (!mentor) {
      throw new NotFoundException(`Mentor with ID ${mentorId} not found.`);
    }

    // CRITICAL FIX: Gather all relevant insights using AnalyticsService
    const internInsights = await this.analyticsService.getInternInsights(internId);

    const githubData = internInsights.github;
    const nlpData = internInsights.nlp;
    const taskData = internInsights.tasks;

    // Default values if data is missing
    const totalCommits = githubData?.totalCommits || 0;
    const totalAdditions = githubData?.totalAdditions || 0;
    const totalDeletions = githubData?.totalDeletions || 0;
    const taskCompletionRate = taskData?.completionRate?.toFixed(0) || '0';
    const sentiment = nlpData?.sentimentScore || "Neutral";
    const keyThemes = nlpData?.keyThemes?.join(', ') || "No specific themes identified.";

    // --- Prompt Engineering ---
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

    console.log("[AI Drafting] Generated Prompt:\n", prompt);

    // --- LLM Call (Using Mock/Placeholder for now) ---
    if (!this.genAI || this.USE_AI_MOCKS) {
      console.warn("MOCK AI DRAFT: Google AI API Key is not set or mocks are enabled. Returning a mock draft.");
      return `
      [AI Generated Draft - MOCK]
      Dear ${intern.firstName},

      This is your midpoint performance review, reflecting on your performance as an intern.

      **Strengths:**
      Your proactive engagement is commendable. GitHub records show approximately ${totalCommits} commits, with ${totalAdditions} lines added and ${totalDeletions} lines deleted, indicating active contribution to our codebase. Your task completion rate is ${taskCompletionRate}%, which is a strong indicator of your reliability and ability to meet deadlines. Feedback highlights a generally ${sentiment} sentiment, with themes such as ${keyThemes}.

      **Areas for Growth:**
      Consider exploring deeper into project architecture to understand the broader impact of your code. Proactively seeking feedback on code quality and best practices could also accelerate your growth.

      **Recommendations:**
      Continue to build on your technical skills by taking on new challenges. We encourage you to engage more in team discussions and leverage mentorship opportunities to further develop your professional communication.

      We look forward to your continued growth and contributions in the remainder of your internship.

      Best regards,
      ${mentor.firstName} ${mentor.lastName}
      `;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.LLM_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;

    } catch (llmError: any) {
      console.error("Error calling LLM provider:", llmError);
      throw new InternalServerErrorException("Failed to generate AI draft due to LLM provider error.");
    }
  }
}