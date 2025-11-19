import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GithubApi {
  private BASE = 'https://api.github.com';

  async getRepo(repoId: string) {
    const repo = await axios.get(`${this.BASE}/repositories/${repoId}`);

    return {
      repoName: repo.data.name,
      repoUrl: repo.data.html_url,
      totalCommits: 42,
      stars: repo.data.stargazers_count,
      forks: repo.data.forks_count,
      pullRequests: 2,
    };
  }

  async getTimeSeries(internId: string) {
    return {
      dates: ['2025-01-01', '2025-01-02', '2025-01-03'],
      commits: [2, 5, 3],
    };
  }
}
