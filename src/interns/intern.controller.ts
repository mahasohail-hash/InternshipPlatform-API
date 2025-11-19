import { Controller, Get, Param, Patch, Body, UseGuards, Post } from '@nestjs/common';
import { InternService } from './intern.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users/interns')
@UseGuards(JwtAuthGuard)
export class InternController {
  constructor(private readonly internService: InternService) {}

  @Get()
  async getAllInterns() {
    return this.internService.getAllInterns();
  }

  @Get(':id')
  async getInternById(@Param('id') id: string) {
    return this.internService.getInternById(id);
  }

 @Patch(':id')
  async updateIntern(
    @Param('id') id: string,
    @Body() updateData: { github_username: string },
  ) {
    const updatedIntern = await this.internService.updateIntern(id, updateData);
    return {
      success: true,
      message: 'GitHub username updated successfully',
      data: updatedIntern,
    };
  }


  @Post(':id/verify-github')
  async verifyGitHubUsername(
    @Param('id') id: string,
    @Body('username') username: string,
  ) {
    return this.internService.verifyGitHubUsername(id, username);
  }
   @Get(':id/github-status')
  async getGithubStatus(@Param('id') id: string) {
    return this.internService.getGithubStatus(id);
  }

}
