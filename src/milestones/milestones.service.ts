import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, FindManyOptions } from 'typeorm';
import { Milestone } from './entities/milestone.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/users.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { Task, TaskStatus } from '../projects/entities/task.entity';
import { UpdateTaskDto } from '../projects/dto/update-task.dto';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // --- Project access check ---
  async checkProjectAccess(projectId: string, userId: string, userRole: UserRole): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['mentor', 'intern'],
    });

    if (!project) throw new NotFoundException(`Project ID ${projectId} not found.`);
    if (userRole === UserRole.HR) return project;
    if (!project.mentor) throw new UnauthorizedException('Project has no assigned mentor.');
    if (project.mentor.id !== userId) throw new ForbiddenException('You are not the mentor of this project.');
    return project;
  }

  // --- Milestone access check ---
  async findMilestoneWithAccess(milestoneId: string, userId: string, userRole: UserRole): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['project', 'project.mentor', 'project.intern', 'tasks', 'tasks.assignee'],
    });
    if (!milestone) throw new NotFoundException(`Milestone with ID "${milestoneId}" not found.`);
    if (!milestone.project) throw new InternalServerErrorException(`Milestone ${milestoneId} is not associated with a project.`);
    if (userRole === UserRole.HR) return milestone;
    if (milestone.project.mentor?.id !== userId) throw new ForbiddenException('You do not have permission to access this milestone.');
    return milestone;
  }

// --- Create milestone ---
async create(createMilestoneDto: CreateMilestoneDto, projectId: string, mentorId: string): Promise<Milestone> {
  const project = await this.checkProjectAccess(projectId, mentorId, UserRole.MENTOR);
  const { title, description, dueDate, tasks } = createMilestoneDto;

  if (!title?.trim()) throw new BadRequestException('Milestone title cannot be empty.');

  const newMilestone = this.milestoneRepository.create({
    title,
    description: description ?? undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    projectId: project.id,
    project,
  });

  const savedMilestone = await this.milestoneRepository.save(newMilestone);

  if (tasks?.length) {
    // Use DeepPartial<Task> properly
    const tasksToCreate: Partial<Task>[] = tasks.map(taskDto => ({
      title: taskDto.title,
      description: taskDto.description ?? undefined,
      dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
      status: TaskStatus.TODO,
      milestoneId: savedMilestone.id,
      milestone: undefined, // milestone object can be undefined for DeepPartial
      assigneeId: project.intern?.id ?? undefined,
      assignee: undefined, // assignee object can be undefined for DeepPartial
    }));

    // Save tasks and get full Task[] back
    const savedTasks: Task[] = await this.taskRepository.save(tasksToCreate as any);

    // Assign saved tasks to milestone
    savedMilestone.tasks = savedTasks;
  } else {
    savedMilestone.tasks = [];
  }

  return savedMilestone;
}



  // --- Find milestones ---
  async findAll(projectId?: string, userId?: string, userRole?: UserRole): Promise<Milestone[]> {
    const findOptions: FindManyOptions<Milestone> = {
      relations: ['project', 'project.mentor', 'tasks', 'tasks.assignee'],
      order: { createdAt: 'ASC' },
    };

    if (projectId) {
      findOptions.where = { project: { id: projectId } };
      if (userRole === UserRole.MENTOR && userId) await this.checkProjectAccess(projectId, userId, userRole);
    } else if (userRole === UserRole.MENTOR && userId) {
      const projects = await this.projectRepository.find({ where: { mentor: { id: userId } }, select: ['id'] });
      const projectIds = projects.map(p => p.id);
      if (!projectIds.length) return [];
      findOptions.where = { project: { id: In(projectIds) } };
    } else if (userRole !== UserRole.HR) {
      return [];
    }

    return this.milestoneRepository.find(findOptions);
  }

  async findOne(milestoneId: string, userId: string, userRole: UserRole): Promise<Milestone> {
    return this.findMilestoneWithAccess(milestoneId, userId, userRole);
  }

  // --- Update milestone with nested tasks ---
  async update(milestoneId: string, updateMilestoneDto: UpdateMilestoneDto, mentorId: string): Promise<Milestone> {
    const milestone = await this.findMilestoneWithAccess(milestoneId, mentorId, UserRole.MENTOR);

    if (updateMilestoneDto.title !== undefined) {
      if (!updateMilestoneDto.title.trim()) throw new BadRequestException('Milestone title cannot be empty.');
      milestone.title = updateMilestoneDto.title;
    }
    if (updateMilestoneDto.description !== undefined) milestone.description = updateMilestoneDto.description;
    if (updateMilestoneDto.dueDate !== undefined)
      milestone.dueDate = updateMilestoneDto.dueDate ? new Date(updateMilestoneDto.dueDate) : null;

    if (updateMilestoneDto.tasks !== undefined) {
      const incomingTaskIds = updateMilestoneDto.tasks.map(t => t.id).filter((id): id is string => !!id);
      if (incomingTaskIds.length) {
        await this.taskRepository.delete({ milestone: { id: milestone.id }, id: Not(In(incomingTaskIds)) });
      } else if (updateMilestoneDto.tasks.length === 0) {
        await this.taskRepository.delete({ milestone: { id: milestone.id } });
      }

      const tasksToSave: Partial<Task>[] = await Promise.all(
        updateMilestoneDto.tasks.map(async (taskDto: UpdateTaskDto) => {
          const existingTask = milestone.tasks?.find(t => t.id === taskDto.id);
          let taskAssignee: User | null = null;

          if (taskDto.assignedToInternId === null) taskAssignee = null;
          else if (taskDto.assignedToInternId) {
            taskAssignee = await this.userRepository.findOne({ where: { id: taskDto.assignedToInternId } });
            if (!taskAssignee)
              throw new NotFoundException(
                `Assignee with ID "${taskDto.assignedToInternId}" for task "${taskDto.title || existingTask?.title || milestone.title}" not found.`,
              );
          } else taskAssignee = existingTask?.assignee ?? null;

          const newDueDate =
            taskDto.dueDate !== undefined ? (taskDto.dueDate === null ? null : new Date(taskDto.dueDate)) : existingTask?.dueDate;

          return {
            id: taskDto.id,
            title: taskDto.title || existingTask?.title || '',
description: taskDto.description === undefined ? existingTask?.description : taskDto.description ?? undefined,
            dueDate: newDueDate,
            status: taskDto.status || existingTask?.status || TaskStatus.TODO,
            milestone,
            milestoneId: milestone.id,
            assignee: taskAssignee,
            assigneeId: taskAssignee?.id ?? null,
          } as Partial<Task>;
        }),
      );

      const createdTasks = this.taskRepository.create(tasksToSave);
      await this.taskRepository.save(createdTasks);
      milestone.tasks = createdTasks;
    } else if (updateMilestoneDto.tasks === null) {
      await this.taskRepository.delete({ milestone: { id: milestone.id } });
      milestone.tasks = [];
    }

    return this.milestoneRepository.save(milestone);
  }

  // --- Delete milestone ---
  async remove(milestoneId: string, mentorId: string): Promise<void> {
    const milestone = await this.findMilestoneWithAccess(milestoneId, mentorId, UserRole.MENTOR);
    await this.milestoneRepository.remove(milestone);
  }
}
