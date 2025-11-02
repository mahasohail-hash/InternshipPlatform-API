// src/analytics/github.service.ts

import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Octokit } from '@octokit/rest';
import { ConfigService } from '@nestjs/config';
import { GitHubMetrics } from './entities/github-metrics.entity';
import { User } from '../users/entities/users.entity'; // Your User Entity
import { GitHubSummaryDto } from './dto/github-summary.dto';

@Injectable()
export class GitHubService {
    private octokit: Octokit;
    private owner: string;
    private repo: string;

    constructor(
        @InjectRepository(GitHubMetrics)
        private metricsRepository: Repository<GitHubMetrics>,
        @InjectRepository(User) // Inject the User repository (must be exported by UsersModule)
        private userRepository: Repository<User>,
        private configService: ConfigService,
    ) {
       // Fetch values from environment variables
        this.owner = this.configService.get('GITHUB_REPO_OWNER')!;
        this.repo = this.configService.get('GITHUB_REPO_NAME')!;
        
        this.octokit = new Octokit({
            auth: this.configService.get('GITHUB_PAT'), 
        });
        if (!this.owner || !this.repo) {
             throw new InternalServerErrorException("GitHub config is missing OWNER or REPO name.");
        }
    }

    /**
     * Fetches fresh GitHub data or returns cached data if available and recent.
     */
    async getInternMetricsSummary(internId: string): Promise<GitHubSummaryDto> {
        // 1. CHECK CACHE
        const cachedMetrics = await this.metricsRepository.findOne({
            where: { intern: { id: internId } },
            order: { dateRetrieved: 'DESC' },
        });

        const oneHour = 60 * 60 * 1000; // Cache duration: 1 hour
        if (cachedMetrics && (new Date().getTime() - cachedMetrics.dateRetrieved.getTime()) < oneHour) {
            console.log(`[GitHubService] Returning cached data for ${internId}.`);
            return {
                totalCommits: cachedMetrics.totalCommits,
                linesChanged: cachedMetrics.linesAdded + cachedMetrics.linesDeleted,
                lastUpdated: cachedMetrics.dateRetrieved,
            };
        }

        // 2. FETCH USER AND USERNAME
        const user = await this.userRepository.findOneBy({ id: internId });
        if (!user || !user.githubUsername) {
            throw new NotFoundException('Intern or GitHub username not found for metrics fetch.');
        }

        // 3. FETCH FRESH DATA (Simplified: getting overall commit activity)
       try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const { data: commits } = await this.octokit.repos.listCommits({
                owner: this.owner,
                repo: this.repo,
                author: user.githubUsername, // Filters commits by the intern
                since: thirtyDaysAgo, 
            });
            const totalCommits = commits.length;
            const linesChanged = 50 * totalCommits;          
            // NOTE: For lines changed, you'd typically use getRepoStatsCodeFrequency or listCommits,
            // but we'll use 0 for the simplified example:
            const linesAdded = 0; 
            const linesDeleted = 0;

            // 4. PROCESS AND CACHE
            const newMetric = this.metricsRepository.create({
                intern: user,
                internUsername: user.githubUsername,
                dateRetrieved: new Date(),
                totalCommits: totalCommits,
                linesAdded: linesChanged,
                linesDeleted: linesDeleted, 
            });

            await this.metricsRepository.save(newMetric);

            return {
                totalCommits: totalCommits,
                 linesChanged: linesChanged,
                lastUpdated: newMetric.dateRetrieved,
            };
        } catch (error) {
            console.error(`GitHub API error for ${user.githubUsername}:`, error);
            throw new InternalServerErrorException('Failed to fetch data from GitHub API.');
        }
    }
}