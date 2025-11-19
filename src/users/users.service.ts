import {
    Injectable, NotFoundException, BadRequestException,
    InternalServerErrorException, ConflictException,
    UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, FindOptionsWhere, FindManyOptions, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { ChecklistsService } from '../checklists/checklists.service';
import { ChecklistTemplate } from '../checklists/entities/checklist-template.entity';
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { InternChecklistItem } from '../checklists/entities/intern-checklist-item.entity';
import { InternUserDto } from './dto/intern-user.dto';

@Injectable()
export class UsersService {
    usersRepo: any;
    findById(mentorId: string) {
      throw new Error('Method not implemented.');
    }
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        private readonly entityManager: EntityManager,

        private readonly checklistsService: ChecklistsService,

        @InjectRepository(InternChecklist)
        private internChecklistRepository: Repository<InternChecklist>,
        @InjectRepository(InternChecklistItem)
        private internChecklistItemRepository: Repository<InternChecklistItem>,
    ) {}

    async findOne(id: string): Promise<User> {
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
                'checklists' // CRITICAL FIX: Add `checklists` relation if it exists on User entity.
            ],
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found.`);
        }
        return user;
    }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { email },
            select: ['id', 'email', 'firstName', 'lastName', 'role', 'passwordHash'],
        });
    }

    async findUsersByRole(role?: UserRole): Promise<InternUserDto[]> {
    if (role !== UserRole.INTERN) {
        return [];
    }
    
    try {
        // 🔥 CRITICAL FIX: Use Query Builder to bypass TypeORM's default entity mapping
        const rawUsers = await this.usersRepository
            .createQueryBuilder('user')
            .select(['user.id', 'user.firstName', 'user.lastName', 'user.email'])
            .where('user.role = :role', { role: UserRole.INTERN })
            .orderBy('user.lastName', 'ASC')
            .getMany(); // Use getMany() to retrieve the User entities

        // Diagnostic: Check if any data was found
        console.log(`[UsersService] Query Builder found ${rawUsers.length} intern records.`);

        // Map the result cleanly to the DTO structure
       return rawUsers.map((user: User) => ({ 
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role, // Now safely accessible
        })) as InternUserDto[];

    } catch (error) {
        console.error('[UsersService] FATAL Query Builder Crash:', error);
        // Throw an explicit server error if the query fails (e.g., table missing)
        throw new InternalServerErrorException('Error retrieving intern list from database.');
    }
}

    private async saveNewUser(createUserDto: CreateUserDto, forceRole?: UserRole): Promise<User> {
        const { password, ...userData } = createUserDto;

        const existingUser = await this.usersRepository.findOneBy({ email: userData.email });
        if (existingUser) {
            throw new ConflictException(`User with email "${userData.email}" already exists.`);
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = this.usersRepository.create({
                ...userData,
                passwordHash: hashedPassword,
                // CRITICAL FIX: Remove UserRole.USER if it does not exist. Use a valid enum member.
                // Defaulting to INTERN or ADMIN for setup, or USER if it's explicitly defined.
                role: forceRole || userData.role || UserRole.INTERN, // Fallback to INTERN
            });

            return this.usersRepository.save(newUser);
        } catch (error) {
            console.error("[UsersService] Password Hashing or DB Save Failed:", error);
            throw new InternalServerErrorException("User creation failed due to server error or hashing failure.");
        }
    }

    async createIntern(createUserDto: CreateUserDto): Promise<User> {
        createUserDto.role = UserRole.INTERN;
        const savedUser: User = await this.saveNewUser(createUserDto, UserRole.INTERN);

        try {
            await this.assignOnboardingChecklists(savedUser);
            console.log(`[Checklist] Successfully assigned checklist to intern ${savedUser.id}.`);
        } catch (checklistError) {
            console.error(`[Checklist Assignment FAIL] Intern ${savedUser.id}:`, checklistError);
        }

        return savedUser;
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        return this.saveNewUser(createUserDto);
    }

    private async assignOnboardingChecklists(user: User): Promise<void> {
        if (user.role !== UserRole.INTERN) {
            return;
        }
        console.log(`[ASSIGNMENT START] Intern ${user.id}: Fetching default template...`);

        const defaultTemplate: ChecklistTemplate | null = await this.checklistsService.findDefaultTemplate();

        if (!defaultTemplate) {
            console.warn(`[ASSIGNMENT FAIL] No default checklist template found. Skipping assignment.`);
            return;
        }

        const templateItems = defaultTemplate.items || [];
        if (templateItems.length === 0) {
            console.warn(`[ASSIGNMENT FAIL] Default template has no items. Skipping assignment.`);
            return;
        }

        await this.entityManager.transaction(async transactionalEntityManager => {
            const newChecklist = await transactionalEntityManager.save(
                transactionalEntityManager.create(InternChecklist, {
                    intern: user,
                    template: defaultTemplate,
                })
            );

            const itemsToCreate = templateItems.map((templateItem) =>
                transactionalEntityManager.create(InternChecklistItem, {
                    title: templateItem.title,
                    description: templateItem.description || templateItem.title,
                    isCompleted: false,
                    internChecklist: newChecklist,
                })
            );
            await transactionalEntityManager.save(itemsToCreate);
            console.log(`[ASSIGNMENT SUCCESS] Checklist ${newChecklist.id} created for intern ${user.id}.`);
        });
        console.log(`[ASSIGNMENT END] Checklist assignment process completed for intern ${user.id}.`);
    }

    async _internal_forcePasswordReset(userId: string, newPass: string, newRole?: UserRole): Promise<void> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) throw new NotFoundException(`User with ID ${userId} not found for force reset.`);
        const newPasswordHash = await bcrypt.hash(newPass, 10);
        const updatePayload: Partial<User> = { passwordHash: newPasswordHash };
        if (newRole && user.role !== newRole) updatePayload.role = newRole;
        await this.usersRepository.update(userId, updatePayload);
        console.warn(`[FORCE RESET] Password/role updated for user ${userId}.`);
    }

    async remove(id: string): Promise<void> {
        await this.usersRepository.findOneByOrFail({ id });
        const result = await this.usersRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`User with ID "${id}" not found for deletion.`);
        }
        console.log(`User ${id} deleted successfully.`);
    }

    async updatePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        const user = await this.usersRepository
            .createQueryBuilder("user")
            .addSelect("user.passwordHash")
            .where("user.id = :id", { id: userId })
            .getOne();

        if (!user || !user.passwordHash) {
            throw new NotFoundException(`User not found or password could not be retrieved for ID "${userId}"`);
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            changePasswordDto.currentPassword,
            user.passwordHash
        );
        if (!isCurrentPasswordValid) {
            throw new UnauthorizedException('Invalid current password.');
        }

        const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

        const updateResult = await this.usersRepository.update(userId, {
            passwordHash: newPasswordHash
        });

        if (updateResult.affected === 0) {
            throw new InternalServerErrorException('Failed to update password.');
        }
        console.log(`Password updated successfully for user ${userId}`);
    }

    async getInternsForHR(): Promise<InternUserDto[]> {
        try {
            const internsWithProgress = await this.usersRepository
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
                .addSelect(`COALESCE(SUM(CASE WHEN item."isCompleted" = TRUE THEN 1 ELSE 0 END), 0)`, 'tasksDone')
                .where('user.role = :role', { role: UserRole.INTERN })
                .groupBy('user.id, user.email, user.firstName, user.lastName, user.role')
                .orderBy('user.lastName', 'ASC')
                .getRawMany();

            return internsWithProgress.map((rawIntern: any) => {
                const total = parseInt(rawIntern.tasksTotal, 10) || 0;
                const done = parseInt(rawIntern.tasksDone, 10) || 0;
                return {
                    id: rawIntern.id,
                    email: rawIntern.email,
                    firstName: rawIntern.firstName || 'N/A',
                    lastName: rawIntern.lastName || 'N/A',
                    role: rawIntern.role,
                    tasksTotal: total,
                    tasksDone: done,
                    checklistStatus: total > 0 && total === done ? 'Complete' : (total === 0 ? 'Not Started' : 'In Progress'),
                };
            });
        } catch (error) {
            console.error("[UsersService] CRITICAL ERROR fetching interns for HR:", error);
            throw new InternalServerErrorException('Could not retrieve intern data for HR dashboard. Check DB connectivity and schema.');
        }
    }

    async checkIfAnyUserExists(): Promise<boolean> {
        const count = await this.usersRepository.count();
        return count > 0;
    }
    
     async updateGithubUsername(id: string, githubUsername: string | null) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.githubUsername = githubUsername || null;
    return this.usersRepo.save(user);
  }
  
}