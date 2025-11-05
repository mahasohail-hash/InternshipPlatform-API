import { Injectable, InternalServerErrorException, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { Project, ProjectStatus } from '../projects/entities/project.entity'; // CRITICAL FIX: Import ProjectStatus
import { Evaluation, EvaluationType } from '../evaluations/entities/evaluation.entity';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { NlpSummary } from './entities/nlp-summary.entity';
import { GithubService } from '../github/github.service';
import { Task, TaskStatus } from '../projects/entities/task.entity';

// --- WINK-NLP IMPORTS AND INITIALIZATION ---
const winkNlp = require('wink-nlp');
const model = require('wink-eng-lite-web-model');
const nlp = winkNlp(model);
const its = nlp.its;
// ------------------------------------------

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Project) private projectsRepository: Repository<Project>,
    @InjectRepository(Evaluation) private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(InternChecklist) private checklistsRepository: Repository<InternChecklist>,
    @InjectRepository(NlpSummary) private nlpSummaryRepository: Repository<NlpSummary>,
    @InjectRepository(Task) private tasksRepository: Repository<Task>,
    private githubService: GithubService,
  ) {}

  async getDashboardSummary() {
    // 1. Total Interns Count
    const totalInterns = await this.usersRepository.count({
      where: { role: UserRole.INTERN },
    });

    // 2. Active Projects Count
    // CRITICAL FIX: Use the ProjectStatus enum member
    const activeProjects = await this.projectsRepository.count({
      where: { status: ProjectStatus.ACTIVE }, // Use enum member directly
    });

    // 3. Total Mentors
    const totalMentors = await this.usersRepository.count({
        where: { role: UserRole.MENTOR }
    });

    // 4. Pending Evaluations (Example: count Midpoint/Final reviews not yet done for active interns)
    const pendingEvaluations = await this.evaluationsRepository.count({
        where: [
            { type: EvaluationType.MIDPOINT },
            { type: EvaluationType.FINAL }
        ],
    });

    // 5. Overall Checklist Completion Rate (For all interns)
    const totalChecklists = await this.checklistsRepository.count();
    const completedChecklists = await this.checklistsRepository.count({
        where: { isComplete: true }
    });
    const completionRate = totalChecklists > 0 ? (completedChecklists / totalChecklists) * 100 : 0;

    return {
      totalInterns,
      activeProjects,
      totalMentors,
      pendingEvaluations,
      checklistsComplete: `${completionRate.toFixed(0)}%`,
    };
  }

  // --- 1. NLP Core Logic: Analyze Single Feedback Text ---
  async analyzeFeedbackText(text: string): Promise<{ sentimentScore: string; keyThemes: string[] }> {
    if (!text || text.trim().length === 0) {
      return { sentimentScore: 'N/A', keyThemes: [] };
    }
    const doc = nlp.readDoc(text);
    const sentiment = doc.out(its.sentiment);

    let sentimentScore: string;
    if (sentiment > 0.3) sentimentScore = 'Positive';
    else if (sentiment < -0.3) sentimentScore = 'Negative';
    else sentimentScore = 'Neutral';

    const importantWords: string[] = doc.tokens().filter(
        (t: any) => t.out(its.type) === 'noun' || t.out(its.type) === 'verb' || t.out(its.type) === 'adjective'
    ).out(its.normal) as string[];

    const wordCounts: Record<string, number> = {};
    const stopWords = new Set(['the', 'is', 'and', 'to', 'of', 'in', 'it', 'a', 'with', 'on', 'for', 'this', 'that']);
    importantWords.forEach((word: string) => {
        const lowerCaseWord = word.toLowerCase();
        if (lowerCaseWord.length > 2 && !stopWords.has(lowerCaseWord)) {
            wordCounts[lowerCaseWord] = (wordCounts[lowerCaseWord] || 0) + 1;
        }
    });

    const keyThemes = Object.keys(wordCounts)
        .sort((a: string, b: string) => wordCounts[b] - wordCounts[a])
        .slice(0, 5);

    return { sentimentScore, keyThemes };
  }

  // --- 2. Orchestration: Generate & Store NLP Summary for an Intern ---
  async generateAndStoreNlpSummaryForIntern(internId: string): Promise<NlpSummary> {
    const intern = await this.usersRepository.findOne({ where: { id: internId } });
    if (!intern) { throw new NotFoundException(`Intern with ID "${internId}" not found.`); }

    const evaluations = await this.evaluationsRepository.find({
        where: { intern: { id: internId } },
        select: ['id', 'feedbackText', 'createdAt'],
        order: { createdAt: 'DESC' },
    });

    const allFeedbackText = evaluations.map((e: Evaluation) => e.feedbackText || '')
        .filter(text => text.trim().length > 0)
        .join('. ');

    if (!allFeedbackText.length) {
        const noFeedbackSummary = { sentimentScore: 'N/A', keyThemes: [] };
        let nlpSummary = await this.nlpSummaryRepository.findOne({
            where: { intern: { id: internId }, evaluation: null as any },
        });
        if (nlpSummary) {
            nlpSummary.summaryJson = noFeedbackSummary;
            nlpSummary.analysisDate = new Date();
            return this.nlpSummaryRepository.save(nlpSummary);
        } else {
            return this.nlpSummaryRepository.save(this.nlpSummaryRepository.create({
                intern: intern,
                summaryJson: noFeedbackSummary,
                analysisDate: new Date(),
                evaluation: null as any,
            }));
        }
    }

    const analysisResult = await this.analyzeFeedbackText(allFeedbackText);

    let nlpSummary = await this.nlpSummaryRepository.findOne({
      where: { intern: { id: internId }, evaluation: null as any },
      relations: ['intern'],
    });

    if (nlpSummary) {
        nlpSummary.summaryJson = analysisResult;
        nlpSummary.analysisDate = new Date();
    } else {
        nlpSummary = this.nlpSummaryRepository.create({
            intern: intern,
            summaryJson: analysisResult,
            analysisDate: new Date(),
            evaluation: null as any,
        });
    }

    return this.nlpSummaryRepository.save(nlpSummary);
  }

  // --- 3. Integration Hub: Get ALL Insights for an Intern (for AI Drafting & Mentor Dashboard) ---
  async getInternInsights(internId: string) {
    const intern = await this.usersRepository.findOne({ where: { id: internId } });
    if (!intern) { throw new NotFoundException(`Intern with ID "${internId}" not found.`); }

    // --- GitHub Metrics (from GithubService) ---
    const githubMetrics = await this.githubService.fetchAndStoreInternContributions(internId);
    let totalCommits = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;
    if (githubMetrics && githubMetrics.length > 0) {
      totalCommits = githubMetrics.reduce((sum, metric) => sum + metric.commits, 0);
      totalAdditions = githubMetrics.reduce((sum, metric) => sum + metric.additions, 0);
      totalDeletions = githubMetrics.reduce((sum, metric) => sum + metric.deletions, 0);
    }

    // --- NLP Summary (NEW) ---
    let nlpSummaryData: { sentimentScore: string; keyThemes: string[] } = { sentimentScore: 'N/A', keyThemes: [] };
    try {
        const internNlpSummary = await this.generateAndStoreNlpSummaryForIntern(internId);
        if (internNlpSummary?.summaryJson) {
            nlpSummaryData = internNlpSummary.summaryJson;
        }
    } catch (error: unknown) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        console.warn(`[NLP INSIGHTS] Could not generate NLP summary for intern ${internId}:`, errorMessage);
    }

    // --- Task Completion Rate ---
    const projectsForIntern = await this.projectsRepository.find({
      where: [{ intern: { id: internId } }, { interns: { id: internId } }],
      relations: ['milestones', 'milestones.tasks'],
    });

    let totalTasks = 0;
    let completedTasks = 0;
    for (const project of projectsForIntern) {
        if (project.milestones) {
            for (const milestone of project.milestones) {
                if (milestone.tasks) {
                    for (const task of milestone.tasks) {
                        totalTasks++;
                        if (task.status === TaskStatus.DONE) {
                            completedTasks++;
                        }
                    }
                }
            }
        }
    }
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // --- Evaluations Due ---
    const evaluationsDue = await this.evaluationsRepository.count({
        where: {
            intern: { id: internId },
        },
    });

    return {
        github: {
            totalCommits: totalCommits,
            totalAdditions: totalAdditions,
            totalDeletions: totalDeletions
        },
        nlp: nlpSummaryData,
        tasks: { total: totalTasks, completed: completedTasks, completionRate: taskCompletionRate },
        evaluationsDue: evaluationsDue,
    };
  }
}