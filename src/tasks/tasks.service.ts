import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// --- FIX 1: Correct Import Paths and Types ---
import { Task, TaskStatus } from '../projects/entities/task.entity'; // FIX: Import Task and TaskStatus from the project/task entity file
import { Milestone } from '../projects/entities/milestone.entity'; // FIX: Correct path to Milestone entity
import { User } from '../users/entities/users.entity'; // FIX: Correct path to User entity (singular)
import { CreateTaskDto } from './dto/create-task.dto'; // Assuming DTO path is correct
import { UpdateTaskDto } from './dto/update-task.dto'; // Assuming DTO path is correct
// --- End Fix 1 ---

@Injectable()
export class TasksService {
  constructor(
    // Inject Task Repository (Assumed to be Task entity)
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    // Inject Milestone Repository
    @InjectRepository(Milestone) 
    private milestonesRepository: Repository<Milestone>,
    // Inject User Repository
    @InjectRepository(User) 
    private userRepository: Repository<User>,
  ) {}

  async create(createTaskDto: CreateTaskDto, milestoneIdFromParam: string): Promise<Task> {
    // 1. Validate the milestone exists
    const milestone = await this.milestonesRepository.findOneBy({ id: milestoneIdFromParam });
    if (!milestone) {
      throw new NotFoundException(`Milestone with ID "${milestoneIdFromParam}" not found.`);
    }

    let assignee: User | null = null;
    // 2. Validate and fetch assignee if provided
    if (createTaskDto.assignedToInternId) {
      assignee = await this.userRepository.findOneBy({ id: createTaskDto.assignedToInternId });
      if (!assignee) {
        throw new NotFoundException(`Assignee User with ID "${createTaskDto.assignedToInternId}" not found.`);
      }
    }

    // 3. Determine status (Use provided status or default)
    const taskStatus = createTaskDto.status || TaskStatus.TODO;

    // 4. Create Task Entity
    const newTask = this.tasksRepository.create({
      // Spread DTO properties (title, description, dueDate)
      ...createTaskDto, 
      status: taskStatus,
      milestone: milestone, // Link to the found milestone object (TypeORM handles FK)
      assignee: assignee, // Link to the found user object or null
    });

    return this.tasksRepository.save(newTask);
  }

  async findAllByMilestone(milestoneId: string): Promise<Task[]> {
    // FIX 2: Correct query using nested relation syntax
    return this.tasksRepository.find({
      where: { milestone: { id: milestoneId } },
      relations: ['assignee'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
        where: { id },
        relations: ['milestone', 'assignee'],
    });
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // Retrieve the existing task with relations needed for update logic
    const task = await this.tasksRepository.findOne({ where: { id }, relations: ['assignee', 'milestone'] });
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    // Handle Assignee Update
    if (updateTaskDto.assignedToInternId !== undefined) {
      if (updateTaskDto.assignedToInternId === null) {
        task.assignee = null; // Unassign
      } else {
        const assignee = await this.userRepository.findOneBy({ id: updateTaskDto.assignedToInternId });
        if (!assignee) {
          throw new NotFoundException(`Assignee User with ID "${updateTaskDto.assignedToInternId}" not found.`);
        }
        task.assignee = assignee; // Assign new user
      }
    }

    // Handle Milestone Change
    if (updateTaskDto.milestoneId && updateTaskDto.milestoneId !== task.milestone?.id) {
       const newMilestone = await this.milestonesRepository.findOneBy({ id: updateTaskDto.milestoneId });
       if (!newMilestone) {
           throw new NotFoundException(`Milestone with ID "${updateTaskDto.milestoneId}" not found.`);
       }
       task.milestone = newMilestone; // Update milestone relation
    }

    // Merge simple updates onto the task entity
    // Destructure properties handled by relations before merging
    const { assignedToInternId, milestoneId, ...simpleUpdates } = updateTaskDto;
    Object.assign(task, simpleUpdates);

    // Save the updated task entity 
    return this.tasksRepository.save(task);
  }


  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
      const task = await this.findOne(id); // Reuse findOne to ensure task exists
      task.status = status;
      return this.tasksRepository.save(task);
  }


  async remove(id: string): Promise<void> {
    const result = await this.tasksRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
  }
}