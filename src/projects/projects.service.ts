// src/projects/projects.service.ts
import { CreateProjectDto } from './dto/create-project.dto';
import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, Not } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { Project, ProjectStatus } from './entities/project.entity';
import { Milestone } from './entities/milestone.entity';
import { Task, TaskStatus } from './entities/task.entity';
import { ProjectDetailsDto } from './dto/project-details.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { TaskCompletionDto } from './dto/task-completion.dto';
import { UserBasicDto } from '../users/dto/user-basic.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateMilestoneDto } from '@/milestones/dto/update-milestone.dto';

@Injectable()
export class ProjectsService {
    getTasksForIntern(internId: string) {
      throw new Error('Method not implemented.');
    }
    constructor(
        @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
        @InjectRepository(Milestone) private readonly milestoneRepository: Repository<Milestone>,
        private readonly entityManager: EntityManager,
    ) {}

    // --- Primary Project retrieval for Intern ---
    async findPrimaryProjectForIntern(internId: string): Promise<ProjectDetailsDto | null> {
        const project = await this.projectRepository.findOne({
            where: {
                intern: { id: internId },
                isPrimary: true,
            },
            relations: ['mentor', 'intern', 'milestones', 'milestones.tasks', 'milestones.tasks.assignee'],
        });
        return project ? this.mapProjectDetails(project) : null;
    }

    // --- Check if mentor is assigned to intern ---
    async isMentorAssignedToIntern(mentorId: string, internId: string): Promise<boolean> {
        const project = await this.projectRepository
            .createQueryBuilder('project')
            .leftJoin('project.intern', 'intern')
            .leftJoin('project.mentor', 'mentor')
            .where('intern.id = :internId', { internId })
            .andWhere('mentor.id = :mentorId', { mentorId })
            .getOne();
        return !!project;
    }

    // --- Get all Intern IDs mentored by a mentor ---
    async getMentoredInternsIds(mentorId: string): Promise<string[]> {
        const projects = await this.projectRepository.find({
            where: { mentor: { id: mentorId } },
            relations: ['intern'],
        });
        return projects.map(p => p.intern?.id).filter((id): id is string => !!id);
    }

    // --- Create a project with milestones and tasks ---
    async createProject(dto: CreateProjectDto, mentorId: string): Promise<Project> {
        const intern = await this.userRepository.findOneBy({ id: dto.internId, role: UserRole.INTERN });
        const mentor = await this.userRepository.findOneBy({ id: mentorId, role: UserRole.MENTOR });

        if (!intern) throw new NotFoundException(`Intern with ID "${dto.internId}" not found.`);
        if (!mentor) throw new UnauthorizedException(`Mentor with ID "${mentorId}" not found.`);

        const existingProject = await this.projectRepository.findOne({ where: { intern: { id: intern.id } } });
        if (existingProject) throw new ConflictException(`Intern is already assigned to a project.`);

        return this.entityManager.transaction(async tm => {
            const newProject = tm.create(Project, {
                title: dto.title,
                description: dto.description,
                intern,
                internId: intern.id,
                mentor,
                mentorId: mentor.id,
                status: dto.status || ProjectStatus.PLANNING,
            });
            const savedProject = await tm.save(newProject);

            const milestones: Milestone[] = [];
            for (const milestoneDto of dto.milestones || []) {
                const newMilestone = tm.create(Milestone, {
                    title: milestoneDto.title,
                    description: milestoneDto.description,
                    dueDate: milestoneDto.dueDate ? new Date(milestoneDto.dueDate) : undefined,
                    project: savedProject,
                    projectId: savedProject.id,
                });
                const savedMilestone = await tm.save(newMilestone);

                const tasks: Task[] = [];
                for (const taskDto of milestoneDto.tasks || []) {
                    const newTask = tm.create(Task, {
                        title: taskDto.title,
                        description: taskDto.description,
                        dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
                        status: taskDto.status || TaskStatus.TODO,
                        milestone: savedMilestone,
                        milestoneId: savedMilestone.id,
                        assignee: intern,
                        assigneeId: intern.id,
                    });
                    tasks.push(await tm.save(newTask));
                }
                savedMilestone.tasks = tasks;
                milestones.push(savedMilestone);
            }

            savedProject.milestones = milestones;
            return savedProject;
        });
    }

    // --- Calculate intern task completion ---
    async calculateInternCompletion(internId: string): Promise<TaskCompletionDto> {
        const totalTasks = await this.taskRepository.count({ where: { assignee: { id: internId } } });
        const completedTasks = await this.taskRepository.count({
            where: { assignee: { id: internId }, status: TaskStatus.DONE },
        });
        const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
        return { totalTasks, completedTasks, completionRate: parseFloat(completionRate.toFixed(2)) };
    }

    // --- Get projects by mentor ---
    async getProjectsByMentor(mentorId: string): Promise<ProjectDetailsDto[]> {
        const projects = await this.projectRepository.find({
            where: { mentor: { id: mentorId } },
            relations: ['mentor', 'intern', 'milestones', 'milestones.tasks', 'milestones.tasks.assignee'],
        });
        return projects.map(p => this.mapProjectDetails(p));
    }

    // --- Get all projects with details ---
    async findAllWithDetails(): Promise<ProjectDetailsDto[]> {
        const projects = await this.projectRepository.find({
            relations: ['mentor', 'intern', 'milestones', 'milestones.tasks', 'milestones.tasks.assignee'],
        });
        return projects.map(p => this.mapProjectDetails(p));
    }

    // --- Get a single project by ID with role-based access ---
    async findOne(projectId: string, userId: string, userRole: UserRole): Promise<ProjectDetailsDto> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['mentor', 'intern', 'milestones', 'milestones.tasks', 'milestones.tasks.assignee'],
        });
        if (!project) throw new NotFoundException(`Project not found.`);

        const hasAccess = userRole === UserRole.HR || project.mentor?.id === userId || project.intern?.id === userId;
        if (!hasAccess) throw new ForbiddenException('No permission to view this project.');

        return this.mapProjectDetails(project);
    }

    // --- Update project ---
    async updateProject(projectId: string, dto: UpdateProjectDto, updaterId: string, updaterRole: UserRole): Promise<Project> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['mentor', 'intern', 'milestones', 'milestones.tasks'],
        });
        if (!project) throw new NotFoundException(`Project not found.`);

        const isHr = updaterRole === UserRole.HR;
        const isMentor = project.mentor?.id === updaterId;
        if (!isHr && !isMentor) throw new ForbiddenException('No permission to update this project.');

        let newIntern = project.intern || null;
        if (dto.internId && dto.internId !== project.internId) {
            newIntern = await this.userRepository.findOneBy({ id: dto.internId, role: UserRole.INTERN });
            if (!newIntern) throw new NotFoundException('Intern not found.');
            const existingProject = await this.projectRepository.findOne({ where: { intern: { id: dto.internId } } });
            if (existingProject && existingProject.id !== projectId) throw new ConflictException('Intern already assigned to another project.');
        } else if (dto.internId === null) {
            newIntern = null;
        }

        return this.entityManager.transaction(async tm => {
            project.title = dto.title || project.title;
            project.description = dto.description || project.description;
            project.status = dto.status || project.status;
            project.intern = newIntern;
            project.internId = newIntern?.id || undefined;

            await tm.save(project);

            // Handle milestones/tasks
            if (dto.milestones) {
                await this.syncMilestonesAndTasks(project, dto.milestones, tm);
            }

            return project;
        });
    }

    // --- Update a task's status ---
    async updateTaskStatus(taskId: string, newStatus: TaskStatus, updaterId: string, updaterRole: UserRole): Promise<Task> {
        const task = await this.taskRepository.findOne({
            where: { id: taskId },
            relations: ['assignee', 'milestone', 'milestone.project', 'milestone.project.mentor'],
        });
        if (!task) throw new NotFoundException('Task not found.');

        const hasAccess = task.assignee?.id === updaterId || task.milestone?.project?.mentor?.id === updaterId || updaterRole === UserRole.HR;
        if (!hasAccess) throw new ForbiddenException('No permission to update task.');

        task.status = newStatus;
        return this.taskRepository.save(task);
    }

    // --- Helper: map project entity to ProjectDetailsDto ---
    private mapProjectDetails(project: Project): ProjectDetailsDto {
        return {
            id: project.id,
            title: project.title,
            description: project.description || null,
            status: project.status,
            mentor: project.mentor ? mapUserBasic(project.mentor) : null,
            intern: project.intern ? mapUserBasic(project.intern) : null,
            milestones: project.milestones?.map(m => ({
                id: m.id,
                title: m.title,
                description: m.description || null,
                dueDate: m.dueDate || null,
                createdAt: m.createdAt,
                updatedAt: m.updatedAt,
                tasks: m.tasks?.map(t => ({
                    id: t.id,
                    title: t.title,
                    description: t.description || null,
                    status: t.status,
                    dueDate: t.dueDate || null,
                    assignee: t.assignee ? mapUserBasic(t.assignee) : null,
                })) || [],
            })) || [],
        };
    }

    // --- Helper: sync milestones & tasks during update ---
    private async syncMilestonesAndTasks(project: Project, milestonesDto: UpdateMilestoneDto[], tm: EntityManager) {
        const incomingIds = milestonesDto.map(m => m.id).filter((id): id is string => !!id);
        if (incomingIds.length > 0) {
            await tm.delete(Milestone, { project: { id: project.id }, id: Not(In(incomingIds)) });
        }

        for (const milestoneDto of milestonesDto) {
            let milestone = milestoneDto.id ? await tm.findOne(Milestone, { where: { id: milestoneDto.id }, relations: ['tasks'] }) : null;
            if (!milestone) {
                milestone = tm.create(Milestone, {
                    title: milestoneDto.title,
                    description: milestoneDto.description,
                    dueDate: milestoneDto.dueDate ? new Date(milestoneDto.dueDate) : undefined,
                    project,
                    projectId: project.id,
                });
            } else {
                milestone.title = milestoneDto.title || milestone.title;
                milestone.description = milestoneDto.description || milestone.description;
                milestone.dueDate = milestoneDto.dueDate ? new Date(milestoneDto.dueDate) : milestone.dueDate;
            }

            const savedMilestone = await tm.save(milestone);

            // Handle tasks
            if (milestoneDto.tasks) {
                const taskIds = milestoneDto.tasks.map(t => t.id).filter((id): id is string => !!id);
                if (taskIds.length > 0) await tm.delete(Task, { milestone: { id: savedMilestone.id }, id: Not(In(taskIds)) });

                for (const taskDto of milestoneDto.tasks) {
                    let task = taskDto.id ? await tm.findOne(Task, { where: { id: taskDto.id } }) : null;
                    const assignee = taskDto.assignedToInternId
                        ? await this.userRepository.findOneBy({ id: taskDto.assignedToInternId })
                        : task?.assignee || null;

                    if (!task) {
                        task = tm.create(Task, {
                            title: taskDto.title || '',
                            description: taskDto.description,
                            dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
                            status: taskDto.status || TaskStatus.TODO,
                            milestone: savedMilestone,
                            milestoneId: savedMilestone.id,
                            assignee,
                            assigneeId: assignee?.id || null,
                        });
                    } else {
                        task.title = taskDto.title || task.title;
                        task.description = taskDto.description || task.description;
                        task.dueDate = taskDto.dueDate ? new Date(taskDto.dueDate) : task.dueDate;
                        task.status = taskDto.status || task.status;
                        task.assignee = assignee;
                        task.assigneeId = assignee?.id || null;
                    }
                    await tm.save(task);
                }
            }
        }
    }
}

// --- Helper: Map User entity to UserBasicDto ---
function mapUserBasic(user: User | null | undefined): UserBasicDto | null {
    if (!user) return null;
    return {
        id: user.id,
        firstName: user.firstName || 'N/A',
        lastName: user.lastName || 'N/A',
        email: user.email,
    } as UserBasicDto;
}
