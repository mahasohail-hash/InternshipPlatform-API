import { Controller, Get, Param, UseGuards, Request, InternalServerErrorException, UnauthorizedException, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { GithubService } from './github.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // CRITICAL FIX: Correct import path
import { RolesGuard } from '../auth/guards/roles.guard'; // CRITICAL FIX: Correct import path
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface'; // CRITICAL FIX: Correct import path

@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards globally to the controller
@Controller('analytics/github') // CRITICAL FIX: Keep the /analytics prefix as it's part of analytics features
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get(':internId') // GET /api/analytics/github/:internId
  @Roles(UserRole.HR, UserRole.MENTOR)
  async getInternGithubContributions(@Param('internId', ParseUUIDPipe) internId: string, @Request() req: RequestWithUser) {
    try {
        // Optional: Add ownership check here if only specific mentors can see specific interns
        return this.githubService.fetchAndStoreInternContributions(internId);
    } catch (error) {
        if (error instanceof NotFoundException || error instanceof InternalServerErrorException || error instanceof UnauthorizedException) {
            throw error;
        }
        console.error("GithubController: Error fetching intern contributions:", error);
        throw new InternalServerErrorException('An unexpected error occurred while fetching GitHub data.');
    }
  }
}