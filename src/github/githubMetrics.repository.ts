import { EntityRepository, Repository } from 'typeorm';
import { GitHubMetrics } from './entities/github-metrics.entity';

@EntityRepository(GitHubMetrics)
export class GitHubMetricsRepository extends Repository<GitHubMetrics> {}
