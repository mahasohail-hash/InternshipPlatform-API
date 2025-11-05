import { Controller, Get, InternalServerErrorException, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { GithubService } from '../github/github.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards globally to the controller
export class AnalyticsController {
   constructor(
      private readonly analyticsService: AnalyticsService,
      private readonly githubService: GithubService, // Injected GithubService
    ) {}
@Get('interns-at-risk')
@Roles(UserRole.HR)
async getInternsAtRisk() {
    // 🔥 MOCK FIX 2: Returns data for the At-Risk Table
    return [
        { key: '3333-4444-cccc-dddd', name: 'Bob Intern', project: 'API Cleanup', tasksOverdue: 5, evaluationScore: 2.5, status: 'At Risk' },
    ];
}

    // 1. GET /api/analytics/summary - Overall dashboard summary for HR/Mentor
  @Get('summary')
  @Roles(UserRole.HR, UserRole.MENTOR)
  async getDashboardSummary() {
    return {
        totalInterns: 12,
        activeProjects: 5,
        pendingEvaluations: 8,
        totalMentors: 4,
    };
    //return this.analyticsService.getDashboardSummary();
  }

    // 2. GET /api/analytics/github-summary/:internId - GitHub metrics summary for an intern
   @Get('github-summary/:internId')
    @Roles(UserRole.MENTOR, UserRole.HR)
    async getGitHubSummary(@Param('internId', ParseUUIDPipe) internId: string) {
        // This endpoint should return an aggregated summary, not raw data
        // You'll need a method in GithubService to provide this
        const githubMetrics = await this.githubService.fetchAndStoreInternContributions(internId);
        const totalCommits = githubMetrics.reduce((sum, metric) => sum + metric.commits, 0);
        const totalAdditions = githubMetrics.reduce((sum, metric) => sum + metric.additions, 0);
        const totalDeletions = githubMetrics.reduce((sum, metric) => sum + metric.deletions, 0);

        return {
            totalCommits,
            totalAdditions,
            totalDeletions,
            lastFetchDate: githubMetrics.length > 0 ? githubMetrics[0].fetchDate : null,
        };
    }

    // 3. GET /api/analytics/nlp-summary/:internId - NLP feedback summary for an intern
    @Get('nlp-summary/:internId')
    @Roles(UserRole.MENTOR, UserRole.HR)
    async getNlpSummary(@Param('internId', ParseUUIDPipe) internId: string) {
        try {
            // This method in AnalyticsService should return the latest NLP summary
            const summary = await this.analyticsService.generateAndStoreNlpSummaryForIntern(internId);
            return summary.summaryJson; // Return the structured JSON content
        } catch (error) {
            if (error instanceof NotFoundException) {
                // If no feedback is found to summarize, return a default 'N/A' summary
                return { sentimentScore: 'N/A', keyThemes: [] };
            }
            throw new InternalServerErrorException('Failed to retrieve NLP summary.');
        }
    }

    // 4. GET /api/analytics/intern/:internId/insights - Comprehensive insights for a specific intern
  @Get('intern/:internId/insights')
  @Roles(UserRole.HR, UserRole.MENTOR)
  async getInternAllInsights(@Param('internId', ParseUUIDPipe) internId: string) {
    try {
        return this.analyticsService.getInternInsights(internId);
    } catch (error: unknown) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);
        if (error instanceof NotFoundException) {
             // Handle specific cases like "intern not found"
             throw error;
        }
        throw new InternalServerErrorException(errorMessage || 'Failed to retrieve intern insights.');
    }
  }
}