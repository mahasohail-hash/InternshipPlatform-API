import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Intern } from './entities/intern.entity';
import { User, UserRole } from '@/users/entities/users.entity';
import { Mentor } from '@/mentor/entities/mentor.entity';
import { Project } from '@/projects/entities/project.entity';
import { ChecklistsService } from '@/checklists/checklists.service';
import { GithubService } from '@/github/github.service';
import { CreateInternDto } from './dto/create-intern.dto';
import { UpdateInternDto } from './dto/update-intern.dto';
import { AssignChecklistsDto } from './dto/assign-checklists.dto';
import { RemoveChecklistDto } from './dto/remove-checklist.dto';

@Injectable()
export class InternService {
  private readonly logger = new Logger(InternService.name);

  constructor(
    @InjectRepository(Intern) private readonly internRepo: Repository<Intern>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly checklistsService: ChecklistsService,
    private readonly githubService: GithubService,
    private readonly dataSource: DataSource,
  ) {}

  // Create a new intern
  async createIntern(createInternDto: CreateInternDto) {
    const { name, hrId, mentorIds, projectIds, checklistIds } = createInternDto;

    // HR is a User with role HR
    const hrUser = await this.userRepo.findOne({ where: { id: hrId, role: UserRole.HR } });
    if (!hrUser) throw new NotFoundException('HR not found');

    const mentors = mentorIds?.length
      ? await this.dataSource.getRepository(Mentor).findBy({ id: In(mentorIds) })
      : [];
    const projects = projectIds?.length
      ? await this.dataSource.getRepository(Project).findBy({ id: In(projectIds) })
      : [];

    const intern = this.internRepo.create({
      name,
      user: hrUser, // link HR user
      mentors,
      projects,
    });

    await this.internRepo.save(intern);

    if (checklistIds?.length) {
      await this.checklistsService.assignTemplatesToInterns(checklistIds, [intern.id]);
    }

    return intern;
  }

  // Get all interns
  async getAllInterns() {
    return this.internRepo.find({ relations: ['user', 'mentors', 'projects', 'checklists'] });
  }

  // Get intern by ID
  async getInternById(id: string) {
    const intern = await this.internRepo.findOne({
      where: { id },
      relations: ['user', 'mentors', 'projects', 'checklists'],
    });
    if (!intern) throw new NotFoundException('Intern not found');
    return intern;
  }

  // Update intern
  async updateIntern(id: string, updateInternDto: UpdateInternDto) {
    const { name, mentorIds, projectIds, checklistIds } = updateInternDto;
    const intern = await this.getInternById(id);

    if (name) intern.name = name;

    if (mentorIds !== undefined) {
      intern.mentors = mentorIds.length
        ? await this.dataSource.getRepository(Mentor).findBy({ id: In(mentorIds) })
        : [];
    }

    if (projectIds !== undefined) {
      intern.projects = projectIds.length
        ? await this.dataSource.getRepository(Project).findBy({ id: In(projectIds) })
        : [];
    }

    await this.internRepo.save(intern);

    if (checklistIds !== undefined) {
      await this.checklistsService.assignTemplatesToInterns(checklistIds, [intern.id]);
    }

    return intern;
  }

  // Assign checklists
  async assignChecklists(assignChecklistsDto: AssignChecklistsDto) {
    const { internIds, checklistIds } = assignChecklistsDto;
    return this.checklistsService.assignTemplatesToInterns(checklistIds ?? [], internIds);
  }

  // Remove checklist from intern
  async removeChecklist(internId: string, checklistId: string) {
    return this.checklistsService.removeChecklistFromIntern(internId, checklistId);
  }

  // Get checklists of logged-in intern
  async getMyChecklists(userId: string) {
    const internProfile = await this.getInternProfileByUserId(userId);
    return this.checklistsService.getChecklistsForIntern(internProfile.id);
  }

  // Get checklists for a specific intern
  async getChecklistsByIntern(internId: string) {
    return this.checklistsService.getChecklistsForIntern(internId);
  }

  // Update checklist item status
  async updateItemStatus(itemId: string, isCompleted: boolean, userId: string) {
    const internProfile = await this.getInternProfileByUserId(userId);
    return this.checklistsService.updateItemStatus(itemId, isCompleted, internProfile.id);
  }

  // Get GitHub status
  async getGithubStatus(internId: string, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.HR) {
      const myProfile = await this.getInternProfileByUserId(user.id);
      if (myProfile.id !== internId) throw new ForbiddenException('Not authorized');
    }
    return this.githubService.getGithubStatus(internId);
  }

  // Update GitHub username
  async updateGithubUsername(internId: string, githubUsername: string, user: { id: string; role: UserRole }) {
    if (!githubUsername) throw new BadRequestException('GitHub username is required');

    if (user.role !== UserRole.HR) {
      const myProfile = await this.getInternProfileByUserId(user.id);
      if (myProfile.id !== internId) throw new ForbiddenException('Not authorized');
    }

    return this.githubService.updateGithubUsername(internId, githubUsername);
  }

  // Get intern profile by User ID
  async getInternProfileByUserId(userId: string): Promise<Intern> {
    const intern = await this.internRepo.findOne({
      where: { user: { id: userId } as any },
      relations: ['user', 'mentors', 'projects', 'checklists'],
    });
    if (!intern) throw new NotFoundException('Intern profile not found for user');
    return intern;
  }
}
