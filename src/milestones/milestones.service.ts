import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from './entities/milestone.entity'; 
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/users.entity'; 

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(Project) 
    private projectRepository: Repository<Project>, 
  ) {}

  // Helper method to check project existence and mentor ownership
  async checkProjectOwnership(projectId: string, mentorId: string): Promise<Project> {
      const project = await this.projectRepository.findOne({
          where: { id: projectId },
          relations: ['mentor'], 
      });

      if (!project) {
          throw new NotFoundException(`Project ID ${projectId} not found.`);
      }
      if (!project.mentor) {
          throw new UnauthorizedException('Project does not have an assigned mentor.');
      }
      if (project.mentor.id !== mentorId) { 
          throw new UnauthorizedException('You are not the mentor of this project.');
      }
      return project;
  }

  // Helper method to find all milestones by project ID
  async findAllByProject(projectId: string): Promise<Milestone[]> {
      return this.milestoneRepository.find({
          where: { project: { id: projectId } }, 
          relations: ['project', 'tasks'],
      });
  }

  // 1. CREATE MILESTONE
  async create(createMilestoneDto: CreateMilestoneDto, 
    mentorId: string, 
    projectId: string 
    ): Promise<Milestone> {
      
    const project = await this.checkProjectOwnership(projectId, mentorId);

    // --- FIX: Use 'name' from the DTO ---
    const name = createMilestoneDto.name; 
    if (!name || !name.trim()) { // Also check if name is just whitespace
      throw new BadRequestException('Milestone name cannot be empty.');
    }
    // ------------------------------------

    const newMilestone = this.milestoneRepository.create({
      // --- FIX: Use 'name' here too ---
      title: name, // The Milestone entity uses 'title', so map 'name' to 'title'
      // ---------------------------------
      project: project, 
      // Optionally map other fields from DTO if needed
      // description: createMilestoneDto.description, 
      // dueDate: createMilestoneDto.dueDate,
    });
    return this.milestoneRepository.save(newMilestone);
  }

  // 2. FIND ALL MILESTONES
  async findAll(projectId: string, mentorId: string): Promise<Milestone[]> {
    await this.checkProjectOwnership(projectId, mentorId); 
    
    return this.milestoneRepository.find({
      where: { project: { id: projectId } }, 
      relations: ['tasks'], 
    });
  }

  // 3. FIND ONE MILESTONE
  async findOne(id: string, mentorId: string): Promise<Milestone> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: id },
      relations: ['project', 'project.mentor', 'tasks', 'tasks.assignee'], 
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID "${id}" not found.`);
    }
    if (!milestone.project) {
        throw new NotFoundException(`Milestone ${id} is not associated with a project.`);
    }
    if (!milestone.project.mentor) {
        throw new UnauthorizedException(`Project associated with milestone ${id} does not have a mentor.`);
    }
    if (milestone.project.mentor.id !== mentorId) { 
        throw new UnauthorizedException('You do not have permission to access this milestone.');
    }
    return milestone;
  }

  // 4. UPDATE MILESTONE
  async update(id: string, updateMilestoneDto: UpdateMilestoneDto, mentorId: string): Promise<Milestone> {
    const milestone = await this.findOne(id, mentorId); 
    
    // --- FIX: Check 'name' from the DTO ---
    if (updateMilestoneDto.name !== undefined) {
        if (!updateMilestoneDto.name.trim()) {
            throw new BadRequestException('Milestone name cannot be empty.');
        }
        // Map DTO's 'name' to entity's 'title' if it exists in the update DTO
        milestone.title = updateMilestoneDto.name; 
        // Remove 'name' from DTO before assigning to avoid TypeORM issues if 'name' isn't on Milestone entity
        delete updateMilestoneDto.name; 
    }
    // --------------------------------------
    
    // Assign the rest of the DTO properties (e.g., description, dueDate)
    Object.assign(milestone, updateMilestoneDto); 
    return this.milestoneRepository.save(milestone);
  }

  // 5. REMOVE MILESTONE
  async remove(id: string, mentorId: string): Promise<void> {
    const milestone = await this.findOne(id, mentorId); 
    await this.milestoneRepository.remove(milestone);
  }
}
