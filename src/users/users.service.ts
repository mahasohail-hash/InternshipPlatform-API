import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateInternDto } from './dto/create-intern.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { ChecklistsService } from '../checklists/checklists.service';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { InternChecklistItem } from '../checklists/entities/intern-checklist-item.entity';
import { InternUserDto } from './dto/intern-user.dto';

export type user= {
  id: string;
  email: string;
  passwordHash: string; 
 firstName: string;
 lastName: string;
}
@Injectable()
export class UsersService {
  
 
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly entityManager: EntityManager,
    private readonly dataSource: DataSource,

    private readonly checklistsService: ChecklistsService,

    @InjectRepository(InternChecklist)
    private readonly internChecklistRepository: Repository<InternChecklist>,

    @InjectRepository(InternChecklistItem)
    private readonly internChecklistItemRepository: Repository<InternChecklistItem>,
  ) {}

  /** Find a user by ID (no relations) */
  async findOneById(id: string,): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);
    return user;
  }

  /** Find a user by ID including all relations */
  async findOneByIdWithRelations(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: [
        'internChecklists',
        'internChecklists.template',
        'internChecklists.items',
        'mentoredProjects',
        'assignedProjects',
        'assignedTasks',
        'githubMetrics',
        'nlpSummaries',
        'receivedEvaluations',
        'givenEvaluations',
        'sessions',
        'checklists',
      ],
    });
    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);
    return user;
  }

  /** Find user by email */
  async findOneByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'passwordHash'],
    });
    if (!user) throw new NotFoundException(`User with email "${email}" not found`);
    return user;
  }
  async findByIds(internIds: string[]): Promise<User[]> {
  if (!internIds?.length) return [];
  const users = await this.usersRepository.find({
    where: { id: In(internIds) },
  });
  return users;
}

  /** Find users by role */
  async findUsersByRole(role?: UserRole): Promise<InternUserDto[]> {
    const query = this.usersRepository.createQueryBuilder('user');
    if (role) query.where('user.role = :role', { role });

    const users = await query.getMany();
    return users.map(u => ({
      id: u.id,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email,
      role: u.role,
    }));
  }

  /** List interns for HR dashboard */
  async getInternsForHR(): Promise<InternUserDto[]> {
    try {
      const raw = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoin('user.internChecklists', 'checklist')
        .leftJoin('checklist.items', 'item')
        .select([
          'user.id AS id',
          'user.email AS email',
          'user.firstName AS "firstName"',
          'user.lastName AS "lastName"',
          'user.role AS role',
        ])
        .addSelect('COALESCE(COUNT(DISTINCT item.id), 0)', 'tasksTotal')
        .addSelect('COALESCE(SUM(CASE WHEN item."isCompleted" = TRUE THEN 1 ELSE 0 END), 0)', 'tasksDone')
        .where('user.role = :role', { role: UserRole.INTERN })
        .groupBy('user.id, user.email, user.firstName, user.lastName, user.role')
        .orderBy('user.lastName', 'ASC')
        .getRawMany();

      return raw.map((r: any) => {
        const total = parseInt(r.tasksTotal, 10) || 0;
        const done = parseInt(r.tasksDone, 10) || 0;
        return {
          id: r.id,
          email: r.email,
          firstName: r.firstName || 'N/A',
          lastName: r.lastName || 'N/A',
          role: r.role,
          tasksTotal: total,
          tasksDone: done,
          checklistStatus: total === 0 ? 'Not Started' : (total === done ? 'Complete' : 'In Progress')
        };
      });
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to retrieve intern data for HR.');
    }
  }

  /** Create general user */
  async createUser(dto: CreateUserDto): Promise<User> {
    return this.saveNewUser(dto);
  }

  /** Create intern with optional checklists */
  async createIntern(dto: CreateInternDto): Promise<User> {
    dto.role = UserRole.INTERN;
    const savedUser = await this.saveNewUser(dto, UserRole.INTERN);

    if (dto.checklistIds?.length) {
      await this.assignTemplatesToInterns(dto.checklistIds, [savedUser.id]);
    } else {
      await this.assignOnboardingChecklists(savedUser);
    }

    return savedUser;
  }

  /** Internal: save user with hashed password */
  private async saveNewUser(dto: CreateUserDto | CreateInternDto, forceRole?: UserRole): Promise<User> {
    const { password, ...userData } = dto;

    const exists = await this.usersRepository.findOneBy({ email: userData.email });
    if (exists) throw new ConflictException(`User with email "${userData.email}" already exists.`);

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = this.usersRepository.create({
      ...userData,
      passwordHash,
      role: forceRole || dto.role || UserRole.INTERN
    });

    return this.usersRepository.save(newUser);
  }

  /** Assign onboarding checklist to intern */
  private async assignOnboardingChecklists(user: User): Promise<void> {
    if (user.role !== UserRole.INTERN) return;

    const templates = await this.checklistsService.findAllTemplates();
    const defaultTemplate = templates[0];
    if (!defaultTemplate || !defaultTemplate.items?.length) return;

    await this.entityManager.transaction(async manager => {
      const checklist = manager.create(InternChecklist, { intern: user, template: defaultTemplate });
      const savedChecklist = await manager.save(checklist);

      const items = defaultTemplate.items.map(item =>
        manager.create(InternChecklistItem, {
          title: item.title,
          description: item.description || item.title,
          isCompleted: false,
          internChecklist: savedChecklist
        })
      );
      await manager.save(items);
    });
  }

  /** Assign multiple templates to multiple interns */
  async assignTemplatesToInterns(templateIds: string[], internIds: string[]): Promise<{ message: string }> {
    const templates = await this.checklistsService.findAllTemplates();
    const selectedTemplates = templates.filter(t => templateIds.includes(t.id));
    if (!selectedTemplates.length) throw new NotFoundException('No valid templates found');

    const interns = await this.usersRepository.findBy({ id: In(internIds), role: UserRole.INTERN });
    if (!interns.length) throw new NotFoundException('No valid interns found');

    await this.entityManager.transaction(async manager => {
      for (const intern of interns) {
        for (const template of selectedTemplates) {
          const checklist = manager.create(InternChecklist, { intern, template });
          const savedChecklist = await manager.save(checklist);

          const items = template.items.map(item =>
            manager.create(InternChecklistItem, {
              title: item.title,
              description: item.description || item.title,
              isCompleted: false,
              internChecklist: savedChecklist
            })
          );
          await manager.save(items);
        }
      }
    });

    return { message: `Assigned ${selectedTemplates.length} templates to ${interns.length} interns` };
  }

  /** Force reset password and optionally update role */
async forcePasswordReset(userId: string, newPassword: string, newRole?: UserRole): Promise<User> {
  const user = await this.usersRepository.findOne({ where: { id: userId } });
  if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

  user.passwordHash = await bcrypt.hash(newPassword, 10);

  if (newRole) {
    user.role = newRole;
  }

  return this.usersRepository.save(user);
}


  /** Update GitHub username */
  async updateGithubUsername(id: string, githubUsername: string | null): Promise<User> {
    const user = await this.findOneById(id);
    user.githubUsername = githubUsername ?? undefined;
    return this.usersRepository.save(user);
  }

  /** Update password */
  async updatePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user || !user.passwordHash) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid current password');

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.update(userId, { passwordHash: newHash });
  }

  /** Check if any user exists */
  async checkIfAnyUserExists(): Promise<boolean> {
    return (await this.usersRepository.count()) > 0;
  }

  async findByResetToken(token: string): Promise<User | null> {
  if (!token) return null;
  return this.usersRepository.findOne({ where: { resetPasswordToken: token } });
}
async findByProviderId(provider: string, providerId: string): Promise<User | null> {
  return await this.usersRepository.findOne({
    where: { provider, providerId },
  });
}




    async update(id: string, data: Partial<User>) { await this.usersRepository.update(id, data); }

  /** Delete a user */
  async remove(userId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      await queryRunner.manager.delete(InternChecklistItem, { internChecklist: { intern: { id: userId } } });
      await queryRunner.manager.delete(InternChecklist, { intern: { id: userId } });
      await queryRunner.manager.delete(User, { id: userId });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
