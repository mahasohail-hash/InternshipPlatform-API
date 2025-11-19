import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GithubService } from '../github/github.service';

// --- Define Interfaces for better type safety ---
interface GithubRepoSummaryItem {
  name: string;
  description: string;
  stars: number;
  forks: number;
  url: string;
  totalCommits: number;
  timeseries: { date: string; commits: number; }[];
}

interface NlpSentimentTimelineItem {
  date: string;
  score: "positive" | "negative" | "neutral";
}

interface NlpTopicItem {
  topic: string;
  frequency: number;
}

interface InternTaskItem {
    id: string;
    title: string;
    summary: string;
    status: string; // e.g., "completed", "pending"
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly githubService: GithubService,
  ) {}

  async getSummary(internId: string) { // internId is a string (UUID)
    let githubSummary: {
      totalCommits: number;
      totalAdditions: number;
      totalDeletions: number;
      repos: GithubRepoSummaryItem[]; // Explicitly type the repos array
    } = {
      totalCommits: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      repos: [],
    };

    let nlpSummary: {
      overallSentiment: string;
      sentimentSummary: string;
      sentimentTimeline: NlpSentimentTimelineItem[]; // Explicitly type
      keywords: string[]; // Explicitly type
      topics: NlpTopicItem[]; // Explicitly type
      emotions: Record<string, number>; // Assuming emotions are string keys to number values
      sentimentScore: string;
      keyThemes: string[]; // Explicitly type
    } = {
      overallSentiment: "N/A",
      sentimentSummary: "No feedback available.",
      sentimentTimeline: [],
      keywords: [],
      topics: [],
      emotions: {},
      sentimentScore: "N/A",
      keyThemes: [],
    };

    let tasksSummary: {
        total: number;
        completed: number;
        completionRate: number;
        list: InternTaskItem[]; // Explicitly type
    } = {
        total: 0,
        completed: 0,
        completionRate: 0,
        list: []
    };
    let evaluationsDue = 0;

    try {
      // 1. Fetch and Aggregate GitHub Metrics
      const githubMetrics = await this.githubService.getMetricsForUser(internId);

      if (githubMetrics && githubMetrics.length > 0) {
        githubSummary.totalCommits = githubMetrics.reduce((sum, metric) => sum + (metric.commits || 0), 0);
        githubSummary.totalAdditions = githubMetrics.reduce((sum, metric) => sum + (metric.additions || 0), 0);
        githubSummary.totalDeletions = githubMetrics.reduce((sum, metric) => sum + (metric.deletions || 0), 0);

        // Populate github.repos with detailed info, including reconstructed timeseries
        githubSummary.repos = await Promise.all(githubMetrics.map(async (metric) => {
          const commitDates: { date: string; sha: string }[] = Array.isArray(metric.rawContributions)
            ? metric.rawContributions.map((c: any) => ({
                date: new Date(c.commit.author.date).toISOString().split('T')[0], // Extract YYYY-MM-DD
                sha: c.sha
              }))
            : [];

          const dailyCommitsMap = commitDates.reduce((acc, c) => {
            acc[c.date] = (acc[c.date] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const timeseries = Object.entries(dailyCommitsMap)
            .map(([date, commits]) => ({ date, commits }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // REAL GITHUB API CALL: You would ideally fetch stars/forks from the GitHub API here
          return {
            name: metric.repoName,
            description: "No description available.",
            stars: 0, // Placeholder
            forks: 0, // Placeholder
            url: `https://github.com/${metric.githubUsername}/${metric.repoName}`,
            totalCommits: metric.commits,
            timeseries: timeseries,
          };
        }));
      }
    } catch (error: any) { // Explicitly type error as any
      this.logger.error(`Failed to fetch GitHub insights for intern ${internId}: ${error.message}`);
      // Return empty github summary to avoid breaking the frontend
      githubSummary = { totalCommits: 0, totalAdditions: 0, totalDeletions: 0, repos: [] };
    }

    // 2. Process NLP Feedback (MOCKED Implementation)
    const mockFeedback = "The intern showed great initiative and consistently delivered high-quality code. Their problem-solving skills are excellent. Sometimes they need more guidance on complex tasks, but overall, a very positive contribution.";
    if (mockFeedback) {
        nlpSummary = {
            overallSentiment: "positive",
            sentimentSummary: "The intern demonstrated strong initiative, delivered high-quality code, and displayed excellent problem-solving skills. While some guidance is occasionally needed for complex tasks, the overall contribution is highly positive.",
            sentimentTimeline: [
                { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), score: "neutral" },
                { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), score: "positive" },
                { date: new Date().toISOString(), score: "positive" },
            ],
            keywords: ["initiative", "high-quality code", "problem-solving", "guidance", "positive contribution"],
            topics: [{ topic: "code quality", frequency: 2 }, { topic: "initiative", frequency: 1 }],
            emotions: { joy: 0.8, sadness: 0.1, anger: 0.05, fear: 0.05 },
            sentimentScore: "positive",
            keyThemes: ["code quality", "problem-solving", "initiative"],
        };
    }

    // 3. Populate Task Summary (MOCKED Implementation)
    tasksSummary = {
        total: 5,
        completed: 3,
        completionRate: 0.6,
        list: [
            { id: 'task1', title: 'Implement User Auth', summary: 'Develop JWT authentication for API', status: 'completed' },
            { id: 'task2', title: 'Design Database Schema', summary: 'Create initial database models', status: 'completed' },
            { id: 'task3', title: 'Build Frontend Dashboard', summary: 'Develop intern dashboard UI', status: 'pending' },
            { id: 'task4', title: 'Write Unit Tests', summary: 'Add test coverage for critical modules', status: 'pending' },
            { id: 'task5', title: 'API Documentation', summary: 'Document all public API endpoints', status: 'completed' },
        ]
    };
    evaluationsDue = 1;

    return {
      github: githubSummary,
      nlp: nlpSummary,
      tasks: tasksSummary,
      evaluationsDue: evaluationsDue,
    };
  }

  async getNlpReport(internId: string) {
    const insights = await this.getSummary(internId);
    return insights.nlp;
  }

  async getRepoDetails(internId: string, repoName: string) {
    const githubMetrics = await this.githubService.getMetricsForUser(internId);
    const targetRepoMetric = githubMetrics.find(m => m.repoName === repoName);

    if (!targetRepoMetric) {
      throw new NotFoundException(`Repo "${repoName}" not found for intern ${internId}`);
    }

    const commitDates: { date: string; sha: string }[] = Array.isArray(targetRepoMetric.rawContributions)
      ? targetRepoMetric.rawContributions.map((c: any) => ({
          date: new Date(c.commit.author.date).toISOString().split('T')[0],
          sha: c.sha
        }))
      : [];

    const dailyCommitsMap = commitDates.reduce((acc, c) => {
      acc[c.date] = (acc[c.date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timeseries = Object.entries(dailyCommitsMap)
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      name: targetRepoMetric.repoName,
      stars: 0, // Placeholder
      forks: 0, // Placeholder
      url: `https://github.com/${targetRepoMetric.githubUsername}/${targetRepoMetric.repoName}`,
      timeseries: timeseries,
    };
  }

  async getInternAllGithubMetrics(internId: string) {
    return this.githubService.getMetricsForUser(internId);
  }
}