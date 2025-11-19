import { Controller, Get, Param } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('analytics')
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get('summary/:internId')
  async getSummary(@Param('internId') internId: string) {
    return this.insightsService.getSummary(internId);
  }

  @Get('intern/:internId/nlp')
  async getNlpReport(@Param('internId') internId: string) {
    return this.insightsService.getNlpReport(internId);
  }

  @Get('github/:internId/repo/:repoName')
  async getRepoDetails(@Param('internId') internId: string, @Param('repoName') repoName: string) {
    return this.insightsService.getRepoDetails(internId, repoName);
  }

  @Get('github/:internId')
  async getInternAllGithubMetrics(@Param('internId') internId: string) {
    return this.insightsService.getInternAllGithubMetrics(internId);
  }
}