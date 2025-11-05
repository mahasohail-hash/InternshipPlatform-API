import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
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

  async checkProjectAccess(projectId: string, userId: string, userRole: UserRole): Promise<Project> {
      const project = await this.projectRepository.findOne({
          where: { id: projectId },
          relations: ['mentor', 'intern'],
      });

      if (!project) {
          throw new NotFoundException(`Project ID ${projectId} not found.`);
      }
      if (userRole === UserRole.HR) {
          return project;
      }
      if (!project.mentor) {
          throw new UnauthorizedException('Project does not have an assigned mentor.');
      }
      if (project.mentor.id !== userId) {
          throw new ForbiddenException('You are not the mentor of this project.');
      }
      return project;
  }

  async findMilestoneWithAccess(milestoneId: string, userId: string, userRole: UserRole): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['project', 'project.mentor', 'project.intern', 'tasks', 'tasks.assignee'],
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID "${milestoneId}" not found.`);
    }
    if (!milestone.project) {
        throw new InternalServerErrorException(`Milestone ${milestoneId} is not associated with a project.`);
    }

    if (userRole === UserRole.HR) {
        return milestone;
    }
    if (milestone.project.mentor?.id !== userId) {
        throw new ForbiddenException('You do not have permission to access this milestone.');
    }
    return milestone;
  }

  async create(
    createMilestoneDto: CreateMilestoneDto,
    projectId: string,
    mentorId: string
  ): Promise<Milestone> {
    const project = await this.checkProjectAccess(projectId, mentorId, UserRole.MENTOR);

    const { title, description, dueDate, tasks } = createMilestoneDto;

    if (!title || !title.trim()) {
        throw new BadRequestException('Milestone title cannot be empty.');
    }
    
    // Ensure dueDate maps to Date or undefined (not null) during creation DTO processing
    const newMilestone = this.milestoneRepository.create({
        title: title,
        description: description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        projectId: project.id,
        project: project,
    });

    const savedMilestone = await this.milestoneRepository.save(newMilestone);
    
    if (tasks && tasks.length > 0) {
        const tasksToCreate = tasks.map(taskDto => this.taskRepository.create({
            title: taskDto.title,
            description: taskDto.description,
            // Use undefined for creation if no date is provided
            dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined, 
            status: TaskStatus.TODO,
            milestone: savedMilestone as any, 
            milestoneId: savedMilestone.id,
            assignee: project.intern,
            assigneeId: project.intern?.id || null,
        }));
        await this.taskRepository.save(tasksToCreate);
        savedMilestone.tasks = tasksToCreate;
    } else {
        savedMilestone.tasks = [];
    }

    return savedMilestone;
  }

  async findAll(projectId?: string, userId?: string, userRole?: UserRole): Promise<Milestone[]> {
    const findOptions: FindManyOptions<Milestone> = {
        relations: ['project', 'project.mentor', 'tasks', 'tasks.assignee'],
        order: { createdAt: 'ASC' },
    };

    if (projectId) {
        findOptions.where = { project: { id: projectId } };
        if (userRole === UserRole.MENTOR && userId) {
            await this.checkProjectAccess(projectId, userId, userRole);
        }
    } else {
        if (userRole === UserRole.MENTOR && userId) {
            const projects = await this.projectRepository.find({
                where: { mentor: { id: userId } },
                select: ['id'],
            });
            const projectIds = projects.map(p => p.id);
            if (projectIds.length === 0) return [];
            findOptions.where = { project: { id: In(projectIds) } };
        } else if (userRole !== UserRole.HR) {
            return [];
        }
    }
    return this.milestoneRepository.find(findOptions);
  }

  async findOne(milestoneId: string, userId: string, userRole: UserRole): Promise<Milestone> {
    return this.findMilestoneWithAccess(milestoneId, userId, userRole);
  }

  async update(milestoneId: string, updateMilestoneDto: UpdateMilestoneDto, mentorId: string): Promise<Milestone> {
    const milestone = await this.findMilestoneWithAccess(milestoneId, mentorId, UserRole.MENTOR);

    if (updateMilestoneDto.title !== undefined) {
        if (!updateMilestoneDto.title.trim()) {
            throw new BadRequestException('Milestone title cannot be empty.');
        }
        milestone.title = updateMilestoneDto.title;
    }
    if (updateMilestoneDto.description !== undefined) {
        milestone.description = updateMilestoneDto.description;
    }
    // CRITICAL FIX: Handle dueDate as Date | null explicitly. `undefined` is also allowed.
    if (updateMilestoneDto.dueDate !== undefined) {
        milestone.dueDate = updateMilestoneDto.dueDate ? new Date(updateMilestoneDto.dueDate) : null;
    } else {
        milestone.dueDate = milestone.dueDate; // Keep existing value if not provided in DTO
    }


    // --- Task Updates (nested logic) ---
    if (updateMilestoneDto.tasks !== undefined && Array.isArray(updateMilestoneDto.tasks)) {
      const incomingTaskIds = updateMilestoneDto.tasks.map(t => t.id).filter((id): id is string => !!id);

      if (incomingTaskIds.length > 0) {
        await this.taskRepository.delete({
          milestone: { id: milestone.id },
          id: Not(In(incomingTaskIds)),
        });
      } else if (updateMilestoneDto.tasks.length === 0) {
        await this.taskRepository.delete({ milestone: { id: milestone.id } });
      }

      const tasksToSave = await Promise.all(updateMilestoneDto.tasks.map(async (taskDto: UpdateTaskDto) => {
        const existingTask = milestone.tasks?.find(t => t.id === taskDto.id);
        let taskAssignee: User | null = null;

        if (taskDto.assignedToInternId === null) {
            taskAssignee = null;
        } else if (taskDto.assignedToInternId) {
            taskAssignee = await this.userRepository.findOneBy({ id: taskDto.assignedToInternId });
            // CRITICAL FIX: Use 'milestone.title' instead of 'savedMilestone.title' since savedMilestone is not in scope here
            if (!taskAssignee) throw new NotFoundException(`Assignee with ID "${taskDto.assignedToInternId}" for task "${taskDto.title || existingTask?.title || milestone.title}" not found.`);
        } else {
            taskAssignee = existingTask?.assignee || null;
        }
        
        // --- Date Handling Logic (Resolved Conflict) ---
        // This is necessary because the DTO might send null (clear date) or a string date.
        let newDueDate: Date | null | undefined;
        if (taskDto.dueDate !== undefined) {
            newDueDate = taskDto.dueDate === null ? null : (taskDto.dueDate ? new Date(taskDto.dueDate) : undefined);
        } else {
            newDueDate = existingTask?.dueDate;
        }

        // CRITICAL FIX: taskRepository.create expects DeepPartial<Task>, ensure properties are compatible.
        return this.taskRepository.create({
          ...existingTask, // Preserve existing properties
          id: taskDto.id,// ID must be present for updates
          title: taskDto.title || existingTask?.title || '', // Must have a non-null title
          description: taskDto.description === undefined ? existingTask?.description : taskDto.description || null, // Allow undefined to not change, null to explicitly clear
          // 🔥 FIX 1: Use the resolved newDueDate variable
          dueDate: newDueDate,
          status: taskDto.status || existingTask?.status || TaskStatus.TODO, // Must have a status
          
          milestone: milestone as any, 
          milestoneId: milestone.id,
          assignee: taskAssignee,
          assigneeId: taskAssignee?.id || null,
        });
      }));
      await this.taskRepository.save(tasksToSave);
      milestone.tasks = tasksToSave;
    } else if (updateMilestoneDto.tasks === null) {
        await this.taskRepository.delete({ milestone: { id: milestone.id } });
        milestone.tasks = [];
    }

    return this.milestoneRepository.save(milestone);
  }

  async remove(milestoneId: string, mentorId: string): Promise<void> {
    const milestone = await this.findMilestoneWithAccess(milestoneId, mentorId, UserRole.MENTOR);
    await this.milestoneRepository.remove(milestone);
  }
}