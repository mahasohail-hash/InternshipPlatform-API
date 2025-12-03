import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus } from '../projects/entities/task.entity';
import { Milestone } from '../projects/entities/milestone.entity';
import { User } from '../users/entities/users.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Milestone)
    private milestonesRepository: Repository<Milestone>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Create a new task
  async create(createTaskDto: CreateTaskDto, milestoneId: string): Promise<Task> {
    const milestone = await this.milestonesRepository.findOneBy({ id: milestoneId });
    if (!milestone) throw new NotFoundException(`Milestone with ID "${milestoneId}" not found.`);

    let assignee: User | null = null;
    if (createTaskDto.assignedToInternId) {
      assignee = await this.userRepository.findOneBy({ id: createTaskDto.assignedToInternId });
      if (!assignee) throw new NotFoundException(`Assignee with ID "${createTaskDto.assignedToInternId}" not found.`);
    }

    const task = this.tasksRepository.create({
      ...createTaskDto,
      status: createTaskDto.status || TaskStatus.TODO,
      milestone,
      assignee,
    });

    return this.tasksRepository.save(task);
  }

  // Get all tasks for a milestone
  async findAllByMilestone(milestoneId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { milestone: { id: milestoneId } },
      relations: ['assignee'],
      order: { createdAt: 'ASC' },
    });
  }

  // Get a single task by ID
  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['milestone', 'assignee'],
    });
    if (!task) throw new NotFoundException(`Task with ID "${id}" not found.`);
    return task;
  }

  // Update a task
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['assignee', 'milestone'],
    });
    if (!task) throw new NotFoundException(`Task with ID "${id}" not found.`);

    // Update assignee
    if (updateTaskDto.assignedToInternId !== undefined) {
      if (updateTaskDto.assignedToInternId === null) {
        task.assignee = null;
      } else {
        const assignee = await this.userRepository.findOneBy({ id: updateTaskDto.assignedToInternId });
        if (!assignee) throw new NotFoundException(`Assignee with ID "${updateTaskDto.assignedToInternId}" not found.`);
        task.assignee = assignee;
      }
    }

    // Update milestone
    if (updateTaskDto.milestoneId && updateTaskDto.milestoneId !== task.milestone?.id) {
      const newMilestone = await this.milestonesRepository.findOneBy({ id: updateTaskDto.milestoneId });
      if (!newMilestone) throw new NotFoundException(`Milestone with ID "${updateTaskDto.milestoneId}" not found.`);
      task.milestone = newMilestone;
    }

    // Merge remaining fields
    const { assignedToInternId, milestoneId, ...otherUpdates } = updateTaskDto;
    Object.assign(task, otherUpdates);

    return this.tasksRepository.save(task);
  }

  // Update task status
  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status;
    return this.tasksRepository.save(task);
  }

  // Remove a task
  async remove(id: string): Promise<void> {
    const result = await this.tasksRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Task with ID "${id}" not found.`);
  }
}
