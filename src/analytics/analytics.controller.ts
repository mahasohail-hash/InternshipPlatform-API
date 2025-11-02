import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { GitHubService } from './github.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(private readonly githubService: GitHubService) {}

    // Expose protected endpoint: GET /api/analytics/github-summary/:internId
   @Get('github-summary/:internId')
    @Roles(UserRole.MENTOR, UserRole.HR) // Mentor needs this data
    async getGitHubSummary(@Param('internId', ParseUUIDPipe) internId: string) {
        return this.githubService.getInternMetricsSummary(internId);
    }
}