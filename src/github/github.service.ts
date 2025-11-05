import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Octokit } from '@octokit/rest';
import { GitHubMetrics } from './entities/github-metrics.entity';
import { User } from '../users/entities/users.entity'; // CRITICAL FIX: Correct import path
import { UsersService } from '../users/users.service'; // CRITICAL FIX: Import UsersService for findOne

@Injectable()
export class GithubService {
  private octokit: Octokit;
  private readonly githubToken: string;
  // CRITICAL FIX: Configure the repositories your interns work on.
  // Example: ['your-org/repo-name-1', 'your-org/repo-name-2']
  private readonly REPOS_TO_MONITOR: string[]; // Set in constructor from config
  private readonly GITHUB_ORG_OWNER: string; // Set in constructor from config

  constructor(
    private configService: ConfigService,
    @InjectRepository(GitHubMetrics)
    private githubMetricsRepository: Repository<GitHubMetrics>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService, // CRITICAL FIX: Inject UsersService
  ) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN') || '';
    this.GITHUB_ORG_OWNER = this.configService.get<string>('GITHUB_ORG_OWNER') || 'mahasohail-hash'; // Your GitHub organization
    this.REPOS_TO_MONITOR = this.configService.get<string>('GITHUB_REPOS_TO_MONITOR')?.split(',') || ['internship-platform-core', 'internship-ui-components']; // Comma-separated list

    if (!this.githubToken) {
      console.warn('WARNING: GITHUB_TOKEN is not configured. GitHubService will not function correctly.');
      // In production, you might throw an error or handle this more gracefully.
      this.octokit = new Octokit(); // Initialize without auth, but it won't work for private repos
    } else {
      this.octokit = new Octokit({ auth: this.githubToken });
    }
  }

  // --- Core Logic: Fetch and Cache GitHub Data ---
  async fetchAndStoreInternContributions(internId: string): Promise<GitHubMetrics[]> {
    // CRITICAL FIX: Use usersService.findOne to get the user with githubUsername
    const intern = await this.usersService.findOne(internId);

    if (!intern || !intern.githubUsername) {
      throw new NotFoundException(`Intern with ID ${internId} not found or has no GitHub username configured.`);
    }

    const { githubUsername } = intern;
    const allMetrics: GitHubMetrics[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize date to compare with DB entries (ignore time)

    for (const repoName of this.REPOS_TO_MONITOR) {
      // Check for cached data first (e.g., fetched today for this intern and repo)
      let cachedMetrics = await this.githubMetricsRepository.findOne({
        where: {
          intern: { id: internId }, // Use intern relation
          repoName: `${this.GITHUB_ORG_OWNER}/${repoName}`,
          fetchDate: today,
        },
      });

      if (cachedMetrics) {
        allMetrics.push(cachedMetrics);
        continue; // Use cached data, skip GitHub API call
      }

      // Fetch from GitHub API if no cached data or cache is outdated
      try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3); // Get contributions for the last 3 months

        const commitsResponse = await this.octokit.rest.repos.listCommits({
          owner: this.GITHUB_ORG_OWNER,
          repo: repoName,
          author: githubUsername,
          per_page: 100,
          since: threeMonthsAgo.toISOString(),
        });

        let totalCommits = commitsResponse.data.length;
        let totalAdditions = 0;
        let totalDeletions = 0;

        // Fetch detailed stats for each commit (this is the most expensive part)
        // Optimize: Only fetch details for the most recent N commits or aggregate.
        for (const commit of commitsResponse.data) {
          const commitDetails = await this.octokit.rest.repos.getCommit({
            owner: this.GITHUB_ORG_OWNER,
            repo: repoName,
            ref: commit.sha,
          });
          totalAdditions += commitDetails.data.stats?.additions || 0;
          totalDeletions += commitDetails.data.stats?.deletions || 0;
        }

        // Store new metrics in your database cache
        const newMetrics = this.githubMetricsRepository.create({
          intern: intern, // Link to intern entity
          internId: intern.id, // Explicitly set FK
          githubUsername: githubUsername,
          repoName: `${this.GITHUB_ORG_OWNER}/${repoName}`,
          fetchDate: today,
          commits: totalCommits,
          additions: totalAdditions,
          deletions: totalDeletions,
          rawContributions: commitsResponse.data, // Cache raw data
        });

        const savedMetrics = await this.githubMetricsRepository.save(newMetrics);
        allMetrics.push(savedMetrics);

      } catch (error: any) {
        console.error(`[GITHUB API ERROR] Failed to fetch data for ${githubUsername} on ${repoName}. Response: ${error.status || 'N/A'} - ${error.message}`);
        // Provide a generic error message to the frontend or specific ones based on error.status
        if (error.status === 404) {
            throw new NotFoundException(`GitHub username '${githubUsername}' or repository '${repoName}' not found.`);
        } else if (error.status === 401) {
            throw new UnauthorizedException('GitHub API token is invalid or expired.');
        } else {
            throw new InternalServerErrorException(`Failed to retrieve GitHub contributions: ${error.message || 'Unknown API error.'}`);
        }
      }
    }

    return allMetrics; // Return all fetched/cached metrics
  }

  // Helper to get an aggregated summary (if needed for a quick dashboard view)
  async getInternMetricsSummary(internId: string) {
    const metrics = await this.fetchAndStoreInternContributions(internId);
    if (metrics.length === 0) {
        return { totalCommits: 0, totalAdditions: 0, totalDeletions: 0, lastFetchDate: null };
    }
    const totalCommits = metrics.reduce((sum, m) => sum + m.commits, 0);
    const totalAdditions = metrics.reduce((sum, m) => sum + m.additions, 0);
    const totalDeletions = metrics.reduce((sum, m) => sum + m.deletions, 0);
    const lastFetchDate = metrics.reduce((latest, m) => (m.fetchDate > latest ? m.fetchDate : latest), metrics[0].fetchDate);

    return { totalCommits, totalAdditions, totalDeletions, lastFetchDate };
  }
}