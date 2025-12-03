import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GithubApi {
  private readonly BASE = 'https://api.github.com';
  private readonly logger = new Logger(GithubApi.name);

  /** Get repository details by repository ID */
  async getRepo(repoId: string) {
    try {
      const response = await axios.get(`${this.BASE}/repositories/${repoId}`);
      const repo = response.data;

      return {
        repoName: repo.name,
        repoUrl: repo.html_url,
        totalCommits: 0, // Placeholder: replace with actual commit fetch if needed
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        pullRequests: 0, // Placeholder: can fetch via /repos/:owner/:repo/pulls if needed
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch repo ${repoId}: ${error.message}`);
      throw new HttpException(
        `GitHub API error: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Get commit time series for an intern (mocked data for now) */
  async getTimeSeries(internId: string) {
    try {
      // Placeholder example: replace with real GitHub API logic if desired
      return {
        dates: ['2025-01-01', '2025-01-02', '2025-01-03'],
        commits: [2, 5, 3],
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch time series for intern ${internId}: ${error.message}`);
      throw new HttpException(
        `GitHub API error: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
