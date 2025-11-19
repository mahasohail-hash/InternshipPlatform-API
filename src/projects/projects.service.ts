import { CreateProjectDto } from './dto/create-project.dto';
import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
    ConflictException,
    InternalServerErrorException,
    BadRequestException,
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
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateMilestoneDto } from '../milestones/dto/update-milestone.dto';
import { UpdateTaskDto } from './dto/update-task.dto';




@Injectable()
export class ProjectsService {

    constructor(
        @InjectRepository(Task) private taskRepository: Repository<Task>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Project) private projectRepository: Repository<Project>,
        @InjectRepository(Milestone) private milestoneRepository: Repository<Milestone>,
        private readonly entityManager: EntityManager,
    ) {}

    async findPrimaryProjectForIntern(internId: string): Promise<ProjectDetailsDto | null> {
  const project = await this.projectRepository.findOne({
    where: {
      intern: { id: internId },  // OR assignedInterns depending on your schema
      isPrimary: true,
    },
    relations: ['mentor', 'milestones', 'milestones.tasks'],
  });

  return project ?? null;
}


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




    async getMentoredInternsIds(mentorId: string): Promise<string[]> {
        const projects = await this.projectRepository.find({
            where: { mentor: { id: mentorId } },
            relations: ['intern'],
            select: ['id'],
        });
        return projects.map(p => p.intern?.id).filter((id): id is string => !!id);
    }

    async createProject(
        dto: CreateProjectDto,
        mentorId: string,
    ): Promise<Project> {
        const intern = await this.userRepository.findOneBy({ id: dto.internId, role: UserRole.INTERN });
        const mentor = await this.userRepository.findOneBy({ id: mentorId, role: UserRole.MENTOR });

        if (!intern) {
            throw new NotFoundException(`Intern with ID "${dto.internId}" not found or is not an INTERN.`);
        }
        if (!mentor) {
            throw new UnauthorizedException(`Mentor with ID "${mentorId}" not found or is not a MENTOR.`);
        }

        const existingProjectForIntern = await this.projectRepository.findOne({
            where: { intern: { id: intern.id } },
        });
        if (existingProjectForIntern) {
            throw new ConflictException(
                `Intern "${intern.firstName} ${intern.lastName}" is already assigned to a project.`,
            );
        }

        return this.entityManager.transaction(async transactionalEntityManager => {
            const newProject = transactionalEntityManager.create(Project, {
                title: dto.title,
                description: dto.description,
                intern: intern,
                internId: intern.id,
                mentor: mentor,
                mentorId: mentor.id,
                status: dto.status || ProjectStatus.PLANNING,
            });

            const savedProject = await transactionalEntityManager.save(newProject);

            const milestones: Milestone[] = [];
            for (const milestoneDto of dto.milestones || []) {
                const newMilestone = transactionalEntityManager.create(Milestone, {
                    title: milestoneDto.title,
                    dueDate: milestoneDto.dueDate ? new Date(milestoneDto.dueDate) : undefined,
                    projectId: savedProject.id,
                    project: savedProject,
                });

                const savedMilestone = await transactionalEntityManager.save(newMilestone);

                const tasks: Task[] = [];
                for (const taskDto of milestoneDto.tasks || []) {
                    const newTask = transactionalEntityManager.create(Task, {
                        title: taskDto.title,
                        description: taskDto.description,
                        dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
                        status: TaskStatus.TODO,
                        milestone: savedMilestone,
                        milestoneId: savedMilestone.id,
                        assignee: intern,
                        assigneeId: intern.id,
                    });
                    tasks.push(newTask);
                }
                await transactionalEntityManager.save(tasks);
                savedMilestone.tasks = tasks;
                milestones.push(savedMilestone);
            }

            savedProject.milestones = milestones;
            return savedProject;
        });
    }

    async calculateInternCompletion(internId: string): Promise<TaskCompletionDto> {
        const totalTasks = await this.taskRepository.count({
            where: { assignee: { id: internId } },
        });

        const completedTasks = await this.taskRepository.count({
            where: {
                assignee: { id: internId },
                status: TaskStatus.DONE,
            },
        });

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
        return {
            totalTasks,
            completedTasks,
            completionRate: parseFloat(completionRate.toFixed(2)),
        };
    }

    async getProjectsByMentor(mentorId: string): Promise<ProjectDetailsDto[]> {
        const rawProjects = await this.projectRepository.find({
            where: { mentor: { id: mentorId } },
            relations: [
                'intern', 'mentor',
                'milestones',
                'milestones.tasks',
                'milestones.tasks.assignee'
            ],
            order: { title: 'ASC' },
        });

        return rawProjects.map(project => ({
            id: project.id,
            title: project.title,
            description: project.description || null,
            status: project.status,
            mentor: mapUserBasic(project.mentor),
            intern: mapUserBasic(project.intern),
            milestones: project.milestones?.map(milestone => ({
                id: milestone.id,
                title: milestone.title,
                description: milestone.description || null,
                dueDate: milestone.dueDate || null,
                createdAt: milestone.createdAt,
                updatedAt: milestone.updatedAt,
                tasks: milestone.tasks?.map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description || null,
                    status: task.status,
                    dueDate: task.dueDate || null,
                    assignee: mapUserBasic(task.assignee),
                })) || [],
            })) || [],
        }));
    }

    async findAllWithDetails(): Promise<ProjectDetailsDto[]> {
        const projects = await this.projectRepository.find({
            relations: [
                'mentor',
                'intern',
                'milestones',
                'milestones.tasks',
                'milestones.tasks.assignee',
            ],
            order: { title: 'ASC' },
        });

        return projects.map(project => ({
            id: project.id,
            title: project.title,
            description: project.description || null,
            status: project.status,
            mentor: mapUserBasic(project.mentor),
            intern: mapUserBasic(project.intern),
            milestones: project.milestones?.map(milestone => ({
                id: milestone.id,
                title: milestone.title,
                description: milestone.description || null,
                dueDate: milestone.dueDate || null,
                createdAt: milestone.createdAt,
                updatedAt: milestone.updatedAt,
                tasks: milestone.tasks?.map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description || null,
                    status: task.status,
                    dueDate: task.dueDate || null,
                    assignee: mapUserBasic(task.assignee),
                })) || [],
            })) || [],
        }));
    }

    async findOne(
        projectId: string,
        userId: string,
        userRole: UserRole,
    ): Promise<ProjectDetailsDto> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: [
                'mentor',
                'intern',
                'milestones',
                'milestones.tasks',
                'milestones.tasks.assignee',
            ],
        });

        if (!project) {
            throw new NotFoundException(`Project with ID ${projectId} not found.`);
        }

        const isMentorOfProject = project.mentor?.id === userId;
        const isInternOnProject = project.intern?.id === userId;

        if (!(userRole === UserRole.HR || isMentorOfProject || isInternOnProject)) {
            throw new ForbiddenException('You do not have permission to view this project.');
        }

        return {
            id: project.id,
            title: project.title,
            description: project.description || null,
            status: project.status,
            mentor: mapUserBasic(project.mentor),
            intern: mapUserBasic(project.intern),
            milestones: project.milestones?.map(milestone => ({
                id: milestone.id,
                title: milestone.title,
                description: milestone.description || null,
                dueDate: milestone.dueDate || null,
                createdAt: milestone.createdAt,
                updatedAt: milestone.updatedAt,
                tasks: milestone.tasks?.map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description || null,
                    status: task.status,
                    dueDate: task.dueDate || null,
                    assignee: mapUserBasic(task.assignee),
                })) || [],
            })) || [],
        };
    }

    async updateProject(
        projectId: string,
        dto: UpdateProjectDto,
        updaterId: string,
        updaterRole: UserRole,
    ): Promise<Project> {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['mentor', 'intern', 'milestones', 'milestones.tasks'],
        });

        if (!project) {
            throw new NotFoundException(`Project with ID "${projectId}" not found.`);
        }

        const isMentorOfProject = project.mentor?.id === updaterId;
        const isHr = updaterRole === UserRole.HR;
        if (!isHr && !isMentorOfProject) {
            throw new ForbiddenException('You do not have permission to update this project.');
        }

        let newIntern: User | null = project.intern || null;
        if (dto.internId && dto.internId !== project.internId) {
            newIntern = await this.userRepository.findOneBy({ id: dto.internId, role: UserRole.INTERN });
            if (!newIntern) {
                throw new NotFoundException(`Intern with ID "${dto.internId}" not found.`);
            }
            const existingProjectForNewIntern = await this.projectRepository.findOneBy({ intern: { id: dto.internId } });
            if (existingProjectForNewIntern && existingProjectForNewIntern.id !== projectId) {
                throw new ConflictException(`The selected intern is already assigned to another project.`);
            }
        } else if (dto.internId === null) {
             newIntern = null;
        }


        return this.entityManager.transaction(async transactionalEntityManager => {
            project.title = dto.title || project.title;
            project.description = dto.description || project.description;
            project.status = dto.status || project.status;
            project.intern = newIntern;
            project.internId = newIntern?.id || null;

            await transactionalEntityManager.save(Project, project);

            if (dto.milestones !== undefined && dto.milestones !== null) {
const incomingMilestoneIds = (dto.milestones as UpdateMilestoneDto[]).map(m => m.id).filter((id): id is string => !!id);
                if (incomingMilestoneIds.length > 0) {
                    await transactionalEntityManager.delete(Milestone, {
                        project: { id: project.id },
                        id: Not(In(incomingMilestoneIds)),
                    });
                } else if (dto.milestones.length === 0) {
                    await transactionalEntityManager.delete(Milestone, { project: { id: project.id } });
                }

                const updatedMilestones: Milestone[] = [];
                for (const milestoneDto of dto.milestones as UpdateMilestoneDto[]) {
                    let currentMilestone = await transactionalEntityManager.findOne(Milestone, { where: { id: milestoneDto.id || '' }, relations: ['tasks'] });

                    if (!currentMilestone) {
                        currentMilestone = transactionalEntityManager.create(Milestone, {
                            title: milestoneDto.title,
                           // description: milestoneDto.description,
                            dueDate: milestoneDto.dueDate ? new Date(milestoneDto.dueDate) : undefined,
                            projectId: project.id,
                            project: project,
                        });
                    } else {
                        currentMilestone.title = milestoneDto.title || currentMilestone.title;
                        currentMilestone.description = milestoneDto.description || currentMilestone.description;
                        currentMilestone.dueDate = milestoneDto.dueDate ? new Date(milestoneDto.dueDate) : currentMilestone.dueDate;
                    }
                    const savedMilestone = await transactionalEntityManager.save(currentMilestone);

                    if (milestoneDto.tasks !== undefined && milestoneDto.tasks !== null) {
                        const incomingTaskIds = milestoneDto.tasks.map(t => t.id).filter((id): id is string => !!id);

                        if (incomingTaskIds.length > 0) {
                            await transactionalEntityManager.delete(Task, {
                                milestone: { id: savedMilestone.id },
                                id: Not(In(incomingTaskIds)),
                            });
                        } else if (milestoneDto.tasks.length === 0) {
                            await transactionalEntityManager.delete(Task, { milestone: { id: savedMilestone.id } });
                        }

                        const updatedTasks: Task[] = [];
                        for (const taskDto of milestoneDto.tasks as UpdateTaskDto[]) {
                            let currentTask = await transactionalEntityManager.findOne(Task, { where: { id: taskDto.id || '' } });
                            let taskAssignee: User | null;

                            if (taskDto.assignedToInternId === null) {
                                taskAssignee = null;
                            } else if (taskDto.assignedToInternId) {
                                taskAssignee = await this.userRepository.findOneBy({ id: taskDto.assignedToInternId });
                                if (!taskAssignee) throw new NotFoundException(`Assignee with ID "${taskDto.assignedToInternId}" for task "${taskDto.title || currentTask?.title || savedMilestone.title}" not found.`);
                            } else {
                                taskAssignee = currentTask?.assignee || null;
                            }

                            if (!currentTask) {
                                currentTask = transactionalEntityManager.create(Task, {
                                    title: taskDto.title || '',
                                    description: taskDto.description,
                                    dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
                                    status: taskDto.status || TaskStatus.TODO,
                                    milestone: savedMilestone,
                                    milestoneId: savedMilestone.id,
                                    assignee: taskAssignee,
                                    assigneeId: taskAssignee?.id || null,
                                });
                            } else {
                                currentTask.title = taskDto.title || currentTask.title || '';
                                currentTask.description = taskDto.description || currentTask.description;
                                currentTask.dueDate = taskDto.dueDate ? new Date(taskDto.dueDate) : currentTask.dueDate;
                                currentTask.status = taskDto.status || currentTask.status;
                                currentTask.assignee = taskAssignee;
                                currentTask.assigneeId = taskAssignee?.id || null;
                            }
                            updatedTasks.push(await transactionalEntityManager.save(currentTask));
                        }
                        savedMilestone.tasks = updatedTasks;
                    } else if (milestoneDto.tasks === null) {
                        await transactionalEntityManager.delete(Task, { milestone: { id: savedMilestone.id } });
                        savedMilestone.tasks = [];
                    }
                    updatedMilestones.push(savedMilestone);
                }
                project.milestones = updatedMilestones;
            } else if (dto.milestones === null) {
                await transactionalEntityManager.delete(Milestone, { project: { id: project.id } });
                project.milestones = [];
            }


            return project;
        });
    }

    async getTasksForIntern(internId: string): Promise<Task[]> {
        return this.taskRepository.find({
            where: { assignee: { id: internId } },
            relations: ['milestone', 'milestone.project'],
            order: { dueDate: 'ASC' },
        });
    }

    

    async updateTaskStatus(
        taskId: string,
        newStatus: TaskStatus,
        updaterId: string,
        updaterRole: UserRole,
    ): Promise<Task> {
        const task = await this.taskRepository.findOne({
            where: { id: taskId },
            relations: ['assignee', 'milestone', 'milestone.project', 'milestone.project.mentor'],
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${taskId} not found.`);
        }

        const isAssignee = task.assignee?.id === updaterId;
        const isProjectMentor = task.milestone?.project?.mentor?.id === updaterId;
        const isHr = updaterRole === UserRole.HR;

        if (!isAssignee && !isProjectMentor && !isHr) {
            throw new ForbiddenException(
                'You do not have permission to update the status of this task.',
            );
        }

        task.status = newStatus;
        return this.taskRepository.save(task);
    }
}

function mapUserBasic(user: User | null | undefined): UserBasicDto | null {
    if (!user) return null;
    return {
        id: user.id,
        firstName: user.firstName || 'N/A', 
        lastName: user.lastName || 'N/A',
        email: user.email, 
    } as UserBasicDto;
}
