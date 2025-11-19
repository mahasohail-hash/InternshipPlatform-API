import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { Project } from '../projects/entities/project.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { NlpSummary } from './entities/nlp-summary.entity';
import { GithubService } from '../github/github.service';
import { Task, TaskStatus } from '../projects/entities/task.entity';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';

// wink-nlp require (keeps compatibility)
const winkNlp = require('wink-nlp');
const model = require('wink-eng-lite-web-model');
const nlp = winkNlp(model);
const its = nlp.its;

@Injectable()
export class AnalyticsService {
  metricsRepo: any;
  octokit: any;
  logger: any;
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Project) private projectsRepository: Repository<Project>,
    @InjectRepository(Evaluation) private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(InternChecklist) private checklistsRepository: Repository<InternChecklist>,
    @InjectRepository(NlpSummary) private nlpSummaryRepository: Repository<NlpSummary>,
    @InjectRepository(Task) private tasksRepository: Repository<Task>,
    private githubService: GithubService,
    private httpService: HttpService,
  ) {}

  // pass-through convenience
  async getGithubRepos(internId: string) {
    return this.githubService.getGithubRepos(internId);
  }

  async getTimeSeries(internId: string, repoName: string) {
    return {
      internId,
      data: [
        { date: '2025-01-01', commits: 4 },
        { date: '2025-01-02', commits: 7 },
        { date: '2025-01-03', commits: 2 },
      ],
    };
  }

   async getRepoDetails(internId: string, repoName: string) {
    try {
      // First get the metrics from our database
      const metrics = await this.metricsRepo.findOne({
        where: {
          intern: { id: internId },
          repoName,
        },
        order: { fetchDate: 'DESC' },
      });

      if (!metrics) {
        throw new Error('Repository metrics not found');
      }

      // Get additional repo info from GitHub API
      const [repoInfo, timeseries] = await Promise.all([
        this.octokit.rest.repos.get({
          owner: metrics.githubUsername,
          repo: repoName,
        }),
        this.getRepoTimeSeries(metrics.githubUsername, repoName),
      ]);

      return {
        name: repoInfo.data.name,
        stars: repoInfo.data.stargazers_count,
        forks: repoInfo.data.forks_count,
        url: repoInfo.data.html_url,
        timeseries,
      };
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error fetching repo details: ${error.message}`);
      throw error;
    }
  }

  async getNlpReport(internId: string) {
    return {
      sentimentTimeline: [],
      keywords: [],
      topics: [],
    };
  }

  // minimal analyzer (keeps parity with NlpEngine)
  async analyzeFeedbackText(text: string): Promise<{ sentimentScore: string; keyThemes: string[] }> {
    if (!text || text.trim().length === 0) return { sentimentScore: 'N/A', keyThemes: [] };

    const doc = nlp.readDoc(text);
    const sentimentVal = doc.out(its.sentiment);
    const sentimentNum = typeof sentimentVal === 'number' ? sentimentVal : Number(sentimentVal);

    let sentimentScore: string;
    if (!isNaN(sentimentNum)) {
      if (sentimentNum > 0.3) sentimentScore = 'Positive';
      else if (sentimentNum < -0.3) sentimentScore = 'Negative';
      else sentimentScore = 'Neutral';
    } else {
      sentimentScore = 'Neutral';
    }

    const importantWords: string[] = doc
      .tokens()
      .filter((t: any) => {
        const type = t.out(its.type);
        return type === 'noun' || type === 'verb' || type === 'adjective';
      })
      .out(its.normal) as string[];

    const stopWords = new Set(['the', 'is', 'and', 'to', 'of', 'in', 'it', 'a', 'with', 'on', 'for', 'this', 'that']);
    const freq: Record<string, number> = {};
    importantWords.forEach((w) => {
      const lw = (w || '').toLowerCase();
      if (lw.length > 2 && !stopWords.has(lw)) freq[lw] = (freq[lw] || 0) + 1;
    });

    const keyThemes = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 5);
    return { sentimentScore, keyThemes };
  }

  // create or update an NLP summary (evaluation = null row)
  async generateAndStoreNlpSummaryForIntern(internId: string): Promise<NlpSummary> {
    const intern = await this.usersRepository.findOne({ where: { id: internId } as any });
    if (!intern) throw new NotFoundException(`Intern with ID "${internId}" not found.`);

    const evaluations = await this.evaluationsRepository.find({
      where: { intern: { id: internId } as any },
      select: ['id', 'feedbackText', 'createdAt'] as any,
      order: { createdAt: 'DESC' } as any,
    });

    const allFeedbackText = evaluations.map((e: Evaluation) => e.feedbackText || '').filter(Boolean).join('. ');

    const noFeedbackSummary = {
      overallSentiment: 'N/A',
      sentimentSummary: 'No feedback available.',
      sentimentTimeline: [] as any[],
      keywords: [] as string[],
      topics: [] as any[],
      emotions: {} as Record<string, number>,
      sentimentScore: 'N/A',
      keyThemes: [] as string[],
    };

    if (!allFeedbackText) {
      let existing = await this.nlpSummaryRepository.findOne({
        where: { intern: { id: internId } as any, evaluation: IsNull() as any },
      } as any);
      if (existing) {
        existing.summaryJson = noFeedbackSummary;
        existing.analysisDate = new Date() as any;
        return this.nlpSummaryRepository.save(existing as any);
      }
      const created = this.nlpSummaryRepository.create({
        intern: intern as any,
        evaluation: null,
        summaryJson: noFeedbackSummary,
        analysisDate: new Date() as any,
      } as Partial<NlpSummary>);
      return this.nlpSummaryRepository.save(created as any);
    }

    const analysis = await this.analyzeFeedbackText(allFeedbackText);
    const summaryJson: any = {
      overallSentiment: (analysis.sentimentScore || 'Neutral').toLowerCase(),
      sentimentSummary: `Detected ${analysis.sentimentScore}`,
      sentimentTimeline: [],
      keywords: analysis.keyThemes,
      topics: (analysis.keyThemes || []).map((k) => ({ topic: k, frequency: 1 })),
      emotions: {},
      sentimentScore: analysis.sentimentScore,
      keyThemes: analysis.keyThemes,
    };

    let nlpSummary = await this.nlpSummaryRepository.findOne({
      where: { intern: { id: internId } as any, evaluation: IsNull() as any },
      relations: ['intern'],
    } as any);

    if (nlpSummary) {
      nlpSummary.summaryJson = summaryJson;
      nlpSummary.analysisDate = new Date() as any;
    } else {
      nlpSummary = this.nlpSummaryRepository.create({
        intern: intern as any,
        evaluation: null,
        summaryJson,
        analysisDate: new Date() as any,
      } as Partial<NlpSummary>);
    }

    return this.nlpSummaryRepository.save(nlpSummary as any);
  }
private async getRepoTimeSeries(username: string, repoName: string) {
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - 3); // Last 3 months

      const commits = await this.octokit.rest.repos.listCommits({
        owner: username,
        repo: repoName,
        author: username,
        since: since.toISOString(),
        per_page: 100,
      });

      // Group commits by date
      const timeseriesMap: Record<string, number> = {};
      for (const commit of commits.data) {
        const date = new Date(commit.commit.author.date).toISOString().split('T')[0];
        timeseriesMap[date] = (timeseriesMap[date] || 0) + 1;
      }

      return Object.entries(timeseriesMap).map(([date, commits]) => ({
        date,
        commits,
      }));
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error fetching timeseries: ${error.message}`);
      return [];
    }
  }



  // combined insights for frontend
  async getInternInsights(internId: string) {
    const intern = await this.usersRepository.findOne({ where: { id: internId } as any });
    if (!intern) throw new NotFoundException(`Intern with ID "${internId}" not found.`);

    // GitHub metrics
    let totalCommits = 0, totalAdditions = 0, totalDeletions = 0;
    if ((intern as any).githubUsername) {
      try {
        const metrics = await this.githubService.fetchAndStoreInternContributions(internId);
        if (metrics && metrics.length) {
          totalCommits = metrics.reduce((s: number, m: any) => s + (m.commits || 0), 0);
          totalAdditions = metrics.reduce((s: number, m: any) => s + (m.additions || 0), 0);
          totalDeletions = metrics.reduce((s: number, m: any) => s + (m.deletions || 0), 0);
        }
      } catch (err) {
        // swallow and return what's available
      }
    }

    // NLP summary
    let nlpSummaryData: any = { sentimentScore: 'N/A', keyThemes: [] };
    try {
      const summary = await this.generateAndStoreNlpSummaryForIntern(internId);
      if (summary?.summaryJson) nlpSummaryData = summary.summaryJson;
    } catch {
      // ignore
    }

    // Task completion
    const projectsForIntern = await this.projectsRepository.find({
      where: [{ intern: { id: internId } as any }, { interns: { id: internId } as any }] as any,
      relations: ['milestones', 'milestones.tasks'],
    });

    let totalTasks = 0, completedTasks = 0;
    for (const p of projectsForIntern) {
      if (!p.milestones) continue;
      for (const m of p.milestones) {
        if (!m.tasks) continue;
        for (const t of m.tasks) {
          totalTasks++;
          if (t.status === TaskStatus.DONE) completedTasks++;
        }
      }
    }
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const evaluationsDue = await this.evaluationsRepository.count({ where: { intern: { id: internId } as any } as any });

    return {
      github: { totalCommits, totalAdditions, totalDeletions },
      nlp: nlpSummaryData,
      tasks: { total: totalTasks, completed: completedTasks, completionRate: taskCompletionRate },
      evaluationsDue,
    };
  }
}
