import { Controller, Get, InternalServerErrorException, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { GithubService } from '../github/github.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly githubService: GithubService,
  ) {}

  @Get('summary')
  @Roles(UserRole.HR, UserRole.MENTOR)
  async getDashboardSummary() {
    // fallback mock — you can call analyticsService.getDashboardSummary() if implemented
    return {
      totalInterns: 12,
      activeProjects: 5,
      pendingEvaluations: 8,
      totalMentors: 4,
    };
  }

  @Get('github/:internId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  async getRawGithubData(@Param('internId', ParseUUIDPipe) internId: string) {
    return this.githubService.fetchAndStoreInternContributions(internId);
  }

   

  @Get('github-summary/:internId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  async getGitHubSummary(@Param('internId', ParseUUIDPipe) internId: string) {
    const githubMetrics = await this.githubService.fetchAndStoreInternContributions(internId);
    const totalCommits = githubMetrics.reduce((sum: number, metric: any) => sum + (metric.commits || 0), 0);
    const totalAdditions = githubMetrics.reduce((sum: number, metric: any) => sum + (metric.additions || 0), 0);
    const totalDeletions = githubMetrics.reduce((sum: number, metric: any) => sum + (metric.deletions || 0), 0);

    return {
      totalCommits,
      totalAdditions,
      totalDeletions,
      lastFetchDate: githubMetrics.length > 0 ? githubMetrics[0].fetchDate : null,
    };
  }

   @Get('interns-at-risk')
@Roles(UserRole.HR, UserRole.MENTOR) // Typically HR/Mentor roles need this data
 async getInternsAtRisk() {
 return [
{ 
 key: '1', 
 name: 'John Doe', 
 project: 'Website Redesign', 
 tasksOverdue: 5, 
 evaluationScore: 2.5, 
 status: 'At Risk' 
 },
 { 
 key: '2', 
 name: 'Jane Smith', 
 project: 'API Development', 
 tasksOverdue: 2, 
 evaluationScore: 3.1, 
status: 'Warning' 
 },
 ];
 }
  @Get('nlp-summary/:internId')
  @Roles(UserRole.MENTOR, UserRole.HR)
  async getNlpSummary(@Param('internId', ParseUUIDPipe) internId: string) {
    try {
      const summary = await this.analyticsService.generateAndStoreNlpSummaryForIntern(internId);
      return summary.summaryJson;
    } catch (error) {
      if (error instanceof NotFoundException) return { sentimentScore: 'N/A', keyThemes: [] };
      throw new InternalServerErrorException('Failed to retrieve NLP summary.');
    }
  }

  @Get('intern/:internId/insights')
  @Roles(UserRole.HR, UserRole.MENTOR)
  async getInternAllInsights(@Param('internId', ParseUUIDPipe) internId: string) {
    try {
      return this.analyticsService.getInternInsights(internId);
    } catch (error) {
      throw new InternalServerErrorException((error as Error)?.message || 'Failed to retrieve intern insights.');
    }
  }

  @Get('intern/:id/nlp')
  getNlp(@Param('id') id: string) {
    return this.analyticsService.getNlpReport(id);
  }

  @Get('intern/:id/repo/:repoId')
  getRepo(@Param('id') id: string, @Param('repoId') repoId: string) {
    return this.analyticsService.getRepoDetails(id, repoId);
  }

    @Get('github/:internId/repo/:repoName')
  async getRepoDetails(
    @Param('internId') internId: string,
    @Param('repoName') repoName: string,
  ) {
    return this.analyticsService.getRepoDetails(internId, repoName);
  }
}
