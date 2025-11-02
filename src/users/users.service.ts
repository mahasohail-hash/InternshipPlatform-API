// File: src/users/users.service.ts
import {
    Injectable, NotFoundException, BadRequestException,
    InternalServerErrorException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, FindOptionsWhere,FindManyOptions } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserMinimalDto } from './dto/user-minimal.dto'; 
import { User } from './entities/users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { ChecklistsService } from '../checklists/checklists.service';
import { ChecklistTemplate } from '../checklists/entities/checklist-template.entity';
// Removed unused entity imports (Checklist, ChecklistItem)
import { InternChecklist } from '../checklists/entities/intern-checklist.entity';
import { InternChecklistItem } from '../checklists/entities/intern-checklist-item.entity';

@Injectable()
export class UsersService {
    constructor(
        // Index 0
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        
        // Index 1 (EntityManager for Transactions)
        private readonly entityManager: EntityManager,
        
        // Inject ChecklistsService for business logic (fetching templates)
        private readonly checklistsService: ChecklistsService,

        // Inject repositories needed exclusively by this service's helpers/transactions
        @InjectRepository(InternChecklist)
        private internChecklistRepository: Repository<InternChecklist>,
        @InjectRepository(InternChecklistItem)
        private internChecklistItemRepository: Repository<InternChecklistItem>,
    ) {}
    
    // -------------------------------------------------------------------------
    // --- CORE FINDER METHODS ---
    // -------------------------------------------------------------------------

    async findOne(id: string): Promise<User> {
    
    const user = await this.usersRepository.createQueryBuilder('user')
        
        // 1. Select base user fields (excluding password)
        .select([
            'user.id', 'user.firstName', 'user.lastName', 'user.email', 
            'user.role', 'user.createdAt', 'user.updatedAt'
        ])
        
        // 2. JOIN InternChecklists (Alias: icl)
        .leftJoinAndSelect('user.internChecklists', 'icl') 
        
        // 3. JOIN TEMPLATE (Alias: tmpl) - Joined from the checklist (icl)
        .leftJoinAndSelect('icl.template', 'tmpl') 
        
        // 4. JOIN ITEMS (Alias: item) - Joined from the checklist (icl)
        .leftJoinAndSelect('icl.items', 'item') 
        
        
        .addSelect([
            'icl.id', 'icl.createdAt', 'icl.templateId',
            'tmpl.id', 'tmpl.name', 'tmpl.description',
            'item.id', 'item.title', 'item.isCompleted', 'item.createdAt'
        ])
        
        .where('user.id = :id', { id }) 
        .getOne();
        
    if (!user) {
        throw new NotFoundException(`Intern with this ID was not found.`);
    }

    if ((user as any).password) {
        delete (user as any).password;
    }
    return user;
}

    async findOneByEmailWithPassword(email: string): Promise<User | undefined> {
        const user = await this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .getOne();
        return user || undefined;
    }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ email });
    }

   async findUsersByRole(role?: UserRole): Promise<UserMinimalDto[]> {
    if (role !== UserRole.INTERN) {
        // Handle other roles or return an empty array if not HR
        return [];
    }

    try {
        const users = await this.usersRepository.find({ // Assuming usersRepository is correct
            where: { 
                role: UserRole.INTERN 
            },
            // 🔥 CRITICAL FIX: Use 'select' to explicitly fetch ONLY the required fields.
            // This bypasses any corrupted data or unexpected relations in other columns.
           select: ['id', 'role'] as (keyof User)[], // Cast is safer for select
            order: { createdAt: 'ASC' },
            // Do NOT include the 'relations' property here, as users don't have complex relations used by the dropdown.
        });

       // Map the result to the minimal DTO structure
        return users.map(user => ({
            id: user.id,
            role: user.role,
            // OMIT all other fields (firstName, lastName, email, relations)
        })) as UserMinimalDto[];

    } catch (error) {
        console.error('[UsersService] FATAL DB CRASH on minimal query:', error);
        // Throw an explicit server-side error
        throw new InternalServerErrorException('Minimal DB query failed. Check database connection/schema integrity.');
    }
}
    // -------------------------------------------------------------------------
    // --- CORE USER MANAGEMENT METHODS ---
    // -------------------------------------------------------------------------

    private async saveNewIntern(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.findOneByEmail(createUserDto.email);
        if (existingUser) {
            throw new ConflictException('Email already in use.');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
        const newUser = this.usersRepository.create({
            ...createUserDto,
            password: hashedPassword,
            role: createUserDto.role || UserRole.INTERN,
        });
        return this.usersRepository.save(newUser);
    }

    // FIX: Primary Onboarding Method (Consolidated Logic)
    async createIntern(createUserDto: CreateUserDto): Promise<User> {
        try {
            // 1. Create and save the user
            const savedUser: User = await this.saveNewIntern(createUserDto); 
            
            // 2. Assign the checklist
            if (savedUser.role === UserRole.INTERN) {
                 await this.assignOnboardingChecklists(savedUser);
            }

            // 3. Re-fetch the user with all relations for the API response
            return this.findOne(savedUser.id); 

        } catch (error: any) {
            if (error instanceof ConflictException) throw error; 
            if (error.code === '23505') throw new ConflictException('Email already exists.');
            
            console.error("CRITICAL ERROR IN USER CREATION/ASSIGNMENT:", error);
            throw new InternalServerErrorException(error.message || 'Could not create user due to a database error.');
        }
    }
    
    async create(createUserDto: CreateUserDto): Promise<User> {
        return this.createIntern(createUserDto); 
    }
    
    // -------------------------------------------------------------------------
    // --- PRIVATE CHECKLIST ASSIGNMENT LOGIC (Transactional) ---
    // -------------------------------------------------------------------------

   private async assignOnboardingChecklists(user: User): Promise<void> {
    if (user.role !== UserRole.INTERN) {
        return;
    }
    console.log(`[ASSIGNMENT START] Intern ${user.id}: Fetching default template...`);

    // This assumes the findDefaultTemplate method exists in ChecklistsService.
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

    // 3. Execute the transaction using the single template
    await this.entityManager.transaction(async transactionalEntityManager => {
        // 1. Create InternChecklist instance
        const newChecklist = await transactionalEntityManager.save(
            transactionalEntityManager.create(InternChecklist, {
                intern: user,
                template: defaultTemplate,
            })
        );

        // 2. Copy Items (using the safe templateItems array)
        const itemsToCreate = templateItems.map((templateItem) => 
            transactionalEntityManager.create(InternChecklistItem, {
                title: templateItem.title,
                description: templateItem.description || templateItem.title, 
                isCompleted: false,
                internChecklist: newChecklist,
            })
        );
        await transactionalEntityManager.save(itemsToCreate);
        console.log(`[ASSIGNMENT SUCCESS] Checklist ${newChecklist.id} created.`);
    });
    console.log(`[ASSIGNMENT END] Checklist assignment process completed.`);
}



    // -------------------------------------------------------------------------
    // --- REMAINING METHODS ---
    // -------------------------------------------------------------------------

    // Force password reset method
    async _internal_forcePasswordReset(userId: string, newPass: string, newRole?: UserRole): Promise<void> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) throw new NotFoundException(`User with ID ${userId} not found for force reset.`);
        const salt = await bcrypt.genSalt();
        const newPasswordHash = await bcrypt.hash(newPass, salt);
        const updatePayload: Partial<User> = { password: newPasswordHash };
        if (newRole && user.role !== newRole) updatePayload.role = newRole;
        await this.usersRepository.update(userId, updatePayload);
        console.warn(`[FORCE RESET] Password/role updated for user ${userId}.`);
    }

    async remove(id: string): Promise<void> {
        await this.findOne(id);
        const result = await this.usersRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`User with ID "${id}" not found for deletion.`);
        }
        console.log(`User ${id} deleted successfully.`);
    }

    async updatePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        const user = await this.usersRepository
            .createQueryBuilder("user")
            .addSelect("user.password")
            .where("user.id = :id", { id: userId })
            .getOne();

        if (!user || !user.password) {
            throw new NotFoundException(`User not found or password could not be retrieved for ID "${userId}"`);
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            changePasswordDto.currentPassword,
            user.password
        );
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Invalid current password.');
        }

        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

        const updateResult = await this.usersRepository.update(userId, {
            password: newPasswordHash
        });

        if (updateResult.affected === 0) {
            throw new InternalServerErrorException('Failed to update password.');
        }
        console.log(`Password updated successfully for user ${userId}`);
    }

    async getInternsForHR(): Promise<any[]> {
        console.log('[UsersService] Fetching interns for HR view...');
        try {
            const internsWithProgress = await this.usersRepository
                .createQueryBuilder('user')
                .leftJoin('user.internChecklists', 'checklist')
                .leftJoin('checklist.items', 'item')
                .select([
                    'user.id AS id', 'user.email AS email', 'user.firstName AS "firstName"', 
                    'user.lastName AS "lastName"', 'user.role AS role'
                ])
                .addSelect('COUNT(item.id)', 'tasksTotal')
                .addSelect(`SUM(CASE WHEN item."isCompleted" = TRUE THEN 1 ELSE 0 END)`, 'tasksDone')
                .where('user.role = :role', { role: UserRole.INTERN })
                .groupBy('user.id')
                .orderBy('"lastName"', 'ASC') 
                .getRawMany();

            return internsWithProgress.map((intern) => {
                const total = parseInt(intern.tasksTotal, 10) || 0;
                const done = parseInt(intern.tasksDone, 10) || 0;
                return {
                    id: intern.id,
                    email: intern.email,
                    firstName: intern.firstName || intern.firstname || 'N/A',
                    lastName: intern.lastName || intern.lastname || 'N/A',
                    role: intern.role,
                    tasksTotal: total,
                    tasksDone: done,
                    status: total > 0 && total === done ? 'Complete' : (total === 0 ? 'Not Started' : 'In Progress'),
                };
            });
        } catch (error) {
            console.error("Error fetching interns for HR:", error);
            throw new InternalServerErrorException('Could not retrieve intern data.');
        }
    }

    async findAllInterns(): Promise<User[]> {
        return this.usersRepository.find({
            where: { role: UserRole.INTERN },
            select: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'],
        });
    }

    async checkIfAnyUserExists(): Promise<boolean> {
        const count = await this.usersRepository.count();
        return count > 0;
    }
}