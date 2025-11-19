import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { Intern } from '../entities/intern.entity'; // Adjust path as necessary
import { GitHubMetrics } from './entities/github-metrics.entity';

const COMMIT_DETAIL_LIMIT = 20;

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly octokit: Octokit;
  private readonly token?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    @InjectRepository(Intern) private readonly internRepo: Repository<Intern>,
    @InjectRepository(GitHubMetrics) private readonly metricsRepo: Repository<GitHubMetrics>,
  ) {
    this.token = this.config.get<string>('GITHUB_TOKEN') || process.env.GITHUB_TOKEN;
    if (!this.token) {
      this.logger.error('Missing GitHub API token in environment. GitHub features will be disabled.');
    }
    this.octokit = new Octokit({ auth: this.token });
  }

  /** Get public repos of an intern */
  async getGithubRepos(internId: string) {
    const intern = await this.internRepo.findOne({ where: { id: internId } as any });
    if (!intern) return [];
  const username = (intern as any).github_username; // Only use this
if (!username) {
  this.logger.warn(`Intern ${internId} has no GitHub username for fetching contributions.`);
  throw new NotFoundException('GitHub username not set for this intern. Please set one.');
}



    try {
      const resp = await this.octokit.rest.repos.listForUser({ username, per_page: 100 });
      return resp.data.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        url: r.html_url,
        stars: r.stargazers_count,
        forks: r.forks_count,
        openIssues: r.open_issues_count,
      }));
    } catch (err: any) { // Explicitly type err as any
      const safe = err?.response?.data ?? err?.message ?? String(err);
      this.logger.error('getGithubRepos error: ' + safe);
      return [];
    }
  }

  /** Fetch and store GitHub contributions for an intern */
 async fetchAndStoreInternContributions(internId: string) {
    // First, check if the intern exists
    const intern = await this.internRepo.findOne({ where: { id: internId } });
    if (!intern) {
      this.logger.error(`Intern with ID ${internId} not found for fetching contributions.`);
      throw new NotFoundException('Intern not found');
    }

    // Check if the intern has a GitHub username
    const username = intern.github_username;
    if (!username) {
      this.logger.error(`Intern ${internId} has no GitHub username for fetching contributions.`);
      throw new NotFoundException('GitHub username not set for this intern.');
    }

    // Verify the GitHub username exists
    const isValid = await this.verifyGitHubUsername(username);
    if (!isValid) {
      this.logger.error(`GitHub username ${username} does not exist or is invalid`);
      throw new NotFoundException(`GitHub username ${username} is invalid or does not exist`);
    }

    try {
      // First clear old data
      await this.metricsRepo.delete({ intern: { id: internId } });

      // Fetch repos
      const repos = await this.octokit.rest.repos.listForUser({ username, per_page: 100 });

      // Set date range for commits
      const since = new Date();
      since.setMonth(since.getMonth() - 3); // Last 3 months

      const allSaved: GitHubMetrics[] = [];

      for (const repo of repos.data) {
        try {
          // Fetch commits for each repo
          const commits = await this.octokit.rest.repos.listCommits({
            owner: username,
            repo: repo.name,
            author: username,
            since: since.toISOString(),
            per_page: 100,
          });

          // Create and save metrics
          const metric = this.metricsRepo.create({
            intern,
            githubUsername: username,
            repoName: repo.name,
            fetchDate: new Date(),
            commits: commits.data.length,
            additions: 0,
            deletions: 0,
            rawContributions: commits.data,
          });

          // Fetch detailed commit stats for additions/deletions
          if (commits.data.length > 0) {
            let additions = 0;
            let deletions = 0;

            // Get detailed stats for first 10 commits to avoid rate limits
            const commitsToCheck = commits.data.slice(0, 10);
            for (const commit of commitsToCheck) {
              try {
                const details = await this.octokit.rest.repos.getCommit({
                  owner: username,
                  repo: repo.name,
                  ref: commit.sha,
                });
                additions += details.data.stats?.additions || 0;
                deletions += details.data.stats?.deletions || 0;
              } catch (err: unknown) {
                const error = err as Error;
                this.logger.warn(`Failed to get commit details for ${commit.sha}: ${error.message}`);
              }
            }

            // Scale up the additions/deletions based on sample
            const scaleFactor = commits.data.length / Math.min(commitsToCheck.length, 10);
            metric.additions = Math.round(additions * scaleFactor);
            metric.deletions = Math.round(deletions * scaleFactor);
          }

          const saved = await this.metricsRepo.save(metric);
          allSaved.push(saved);
        } catch (err: unknown) {
          const error = err as Error;
          this.logger.error(`Error fetching commits for repo ${repo.name} of ${username}: ${error.message}`);
          continue;
        }
      }

      return allSaved;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error fetching GitHub data for ${username}: ${error.message}`);
      throw new Error(`Failed to fetch GitHub data: ${error.message}`);
    }
  }
  /** Alias for older controller */
  async fetchGitHubData(internId: string) {
    return this.fetchAndStoreInternContributions(internId);
  }

  /** Fetch metrics for a USER (might be an intern or another user type) */
  async fetchForUser(userId: string) {
    const user = await this.internRepo.findOne({ where: { id: userId } as any }); // Assuming User entity is also compatible
    if (!user) throw new NotFoundException('User not found');

    const username = (user as any).githubUsername || (user as any).github_username;
    if (!username) throw new NotFoundException('User does not have a GitHub username');

    const reposRes = await this.octokit.rest.repos.listForUser({ username, per_page: 50 });
    const repos = reposRes.data;

    const savedMetrics: GitHubMetrics[] = [];
    const fetchDate = new Date();

    for (const repo of repos) {
      try {
        const commitsResp = await this.octokit.rest.repos.listCommits({
          owner: username,
          repo: repo.name,
          author: username,
          per_page: 100,
        });

        const commitsData = commitsResp.data || [];
        let additions = 0;
        let deletions = 0;

        for (const c of commitsData.slice(0, COMMIT_DETAIL_LIMIT)) {
          try {
            const details = await this.octokit.rest.repos.getCommit({
              owner: username,
              repo: repo.name,
              ref: c.sha,
            });
            additions += details.data.stats?.additions || 0;
            deletions += details.data.stats?.deletions || 0;
          } catch (detailErr: any) { // Explicitly type detailErr as any
            this.logger.warn(`Failed to get commit details for ${c.sha} in ${repo.name}: ${detailErr.message}`);
            continue;
          }
        }

        const metric = this.metricsRepo.create({
          intern: user,
          internId: user.id,
          githubUsername: username,
          repoName: repo.name,
          fetchDate,
          commits: commitsData.length,
          additions,
          deletions,
          rawContributions: commitsData,
        });
        const saved = await this.metricsRepo.save(metric);
        savedMetrics.push(saved);
      } catch (repoErr: any) { // Explicitly type repoErr as any
        this.logger.error(`Error fetching commits for repo ${repo.name} of ${username} for user ID ${userId}: ${repoErr.message}`);
        continue;
      }
    }

    return {
      ok: true,
      fetchedFrom: username,
      reposFound: repos.length,
      metricsStored: savedMetrics.length,
      metrics: savedMetrics,
    };
  }

  /** Get saved metrics for any user/intern */
  async getMetricsForUser(userId: string): Promise<GitHubMetrics[]> {
    return this.metricsRepo.find({
      where: { intern: { id: userId } as any },
      order: { fetchDate: 'DESC' },
    });
  }
    async getMetricsForIntern(internId: string): Promise<GitHubMetrics[]> {
    return this.metricsRepo.find({
      where: { intern: { id: internId } },
      order: { fetchDate: 'DESC' },
    });
  }
  /** Fetch repos by GitHub username */
  async fetchUserReposByUsername(username: string) {
    try {
      const resp = await this.octokit.rest.repos.listForUser({ username, per_page: 100 });
      return resp.data;
    } catch (err: any) { // Explicitly type err as any
      const safe = err?.response?.data ?? err?.message ?? String(err);
      this.logger.error('fetchUserReposByUsername error: ' + safe);
      throw new HttpException('GitHub API failed', HttpStatus.BAD_GATEWAY);
    }
  }
  
  private async validateGithubAccess(username: string) {
  try {
    const resp = await this.octokit.rest.users.getByUsername({ username });
    return !!resp.data;
  } catch (err: any) {
    this.logger.error(`GitHub username validation failed for ${username}: ${err.message}`);
    return false;
  }
}
    async verifyGitHubUsername(username: string): Promise<boolean> {
    try {
      const response = await this.octokit.rest.users.getByUsername({ username });
      return response.status === 200;
    } catch (err) {
      this.logger.error(`GitHub username verification failed for ${username}: ${(err as Error).message}`);
      return false;
    }
  }


}