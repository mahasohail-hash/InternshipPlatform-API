// src/github/dto/github-metrics.dto.ts
export class GitHubMetricsDto {
  id!: string;
  githubUsername!: string;
  repoName!: string;
  fetchDate!: Date;
  commits!: number;
  additions!: number;
  deletions!: number;
  rawContributions?: any;
}
