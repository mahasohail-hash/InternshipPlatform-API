import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole } from '../users/entities/users.entity';
import { GithubService } from '@/github/github.service';

@Injectable()
export class InternService {

  private readonly logger = new Logger(InternService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
     private readonly githubService: GithubService,
  ) {}

   async getInternById(id: string) {
    const where: FindOptionsWhere<User> = {
      id,
      role: 'INTERN' as UserRole,
    };
    const user = await this.userRepo.findOne({ where });
    if (!user) {
      this.logger.error(`Intern with ID ${id} not found.`);
      throw new NotFoundException('Intern not found');
    }
    return user;
  }

   async updateIntern(id: string, updateData: { github_username: string }) {
    const where: FindOptionsWhere<User> = {
      id,
      role: 'INTERN' as UserRole,
    };
    const user = await this.userRepo.findOne({ where });
    if (!user) {
      this.logger.error(`Intern with ID ${id} not found for update.`);
      throw new NotFoundException('Intern not found');
    }

    // Verify GitHub username if provided
    if (updateData.github_username) {
      const isValid = await this.githubService.verifyGitHubUsername(updateData.github_username);
      if (!isValid) {
        throw new NotFoundException(`GitHub username ${updateData.github_username} is invalid or does not exist`);
      }
    }

    const updatedUser = await this.userRepo.save({
      ...user,
      github_username: updateData.github_username,
    });
    this.logger.log(`Updated intern ${id} with GitHub username: ${updateData.github_username}`);
    return updatedUser;
  }
   async getGithubStatus(id: string) {
    const where: FindOptionsWhere<User> = {
      id,
      role: 'INTERN' as UserRole,
    };
    const user = await this.userRepo.findOne({ where });
    if (!user) {
      this.logger.error(`Intern with ID ${id} not found.`);
      throw new NotFoundException('Intern not found');
    }

    return {
      hasGithubUsername: !!user.githubUsername,
      githubUsername: user.githubUsername,
      verified: user.githubUsername ? await this.githubService.verifyGitHubUsername(user.githubUsername) : false
    };
  }
    async verifyGitHubUsername(id: string, username: string): Promise<{ valid: boolean }> {
    try {
      const isValid = await this.githubService.verifyGitHubUsername(username);
      return { valid: isValid };
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error verifying GitHub username: ${error.message}`);
      return { valid: false };
    }
  }
  async getAllInterns() {
    const where: FindOptionsWhere<User> = {
      role: 'INTERN' as UserRole, // Cast to UserRole
    };
    return this.userRepo.find({ where });
  }
}
