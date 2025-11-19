// src/github/github.controller.ts
import { Controller, Get, Param, Post, HttpException, HttpStatus, Body } from '@nestjs/common';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  /** Get all public repos of an intern */
  @Get('intern/:internId/repos')
  async getInternRepos(@Param('internId') internId: string) {
    return this.githubService.getGithubRepos(internId);
  }

  /** Get saved GitHub metrics for an intern */
        @Get('intern/:internId/metrics')
  async getInternMetrics(@Param('internId') internId: string) {
    try {
      return this.githubService.getMetricsForIntern(internId);
    } catch (error: unknown) {
      const err = error as Error;
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

 @Post('intern/fetch/:internId')
async fetchInternData(@Param('internId') internId: string) {
  try {
    const result = await this.githubService.fetchAndStoreInternContributions(internId);
    return {
      success: true,
      message: 'GitHub data fetched successfully',
      data: result
    };
  } catch (error: any) {
    throw new HttpException(
      {
        statusCode: 400,
        message: error.message || 'Failed to fetch intern data',
        internId,
      },
      HttpStatus.BAD_REQUEST
    );
  }
}


  /** Fetch and store GitHub data for a USER (not intern) */
  @Post('fetch/:userId')
  async fetchUserData(@Param('userId') userId: string) {
    return this.githubService.fetchForUser(userId);
  }

  /** Get saved GitHub metrics for a USER (not intern) */
  @Get(':userId/metrics')
  async getUserMetrics(@Param('userId') userId: string) {
    return this.githubService.getMetricsForUser(userId);
  }

  /** Fetch raw repos by GitHub username */
  @Get('user/:username/repos')
  async getReposByUsername(@Param('username') username: string) {
    return this.githubService.fetchUserReposByUsername(username);
  }
  @Post('verify-username')
  async verifyGitHubUsername(@Body('username') username: string) {
    try {
      const isValid = await this.githubService.verifyGitHubUsername(username);
      return { valid: isValid };
    } catch (error: unknown) {
      const err = error as Error;
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
