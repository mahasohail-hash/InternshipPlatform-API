import { CreateProjectDto } from './dto/create-project.dto';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { UserBasicDto } from '../users/dto/user-basic.dto';
// --- FIX: Correct Import Paths and Types ---
import { User } from '../users/entities/users.entity'; // FIX: Path to singular 'user.entity'
import { Project } from './entities/project.entity';
import { Milestone } from './entities/milestone.entity'; // Assuming path to Milestone is correct
import { CreateMilestoneDto } from './dto/create-milestone.dto'; // Assuming this DTO exists
// --- FIX: Import Task and TaskStatus from their respective files ---
import { Task, TaskStatus } from './entities/task.entity'; // FIX: Import Task and TaskStatus
// --- End Fixes ---
import { ProjectDetailsDto } from './dto/project-details.dto';
import { UserRole } from '../common/enums/user-role.enum'; // Adjust path if needed

const mapUserBasic = (user: any | null | undefined) => {
    if (!user) return null;
    return {
        id: user.id || 'N/A',
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        email: user.email || 'N/A',
    };
};
@Injectable()
export class ProjectsService {
  constructor(
    // FIX: Inject TaskRepository (it's missing, but needed for methods below)
    @InjectRepository(Task) private taskRepository: Repository<Task>, 
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Project) private projectRepository: Repository<Project>,
    @InjectRepository(Milestone) private milestoneRepository: Repository<Milestone>,
    private readonly entityManager: EntityManager,
  ) {}

  async createProject(
    dto: CreateProjectDto,
    mentorId: string,
  ): Promise<Project> {
    const intern = await this.userRepository.findOneBy({ id: dto.internId });
    const mentor = await this.userRepository.findOneBy({ id: mentorId });

    if (!intern || !mentor) {
      throw new NotFoundException('Intern or Mentor not found.');
    }

    const existingProject = await this.projectRepository.findOne({
      where: { intern: { id: intern.id } },
    });
    if (existingProject) {
      throw new ConflictException(
        'This intern is already assigned to a project.',
      );
    }

    return this.entityManager.transaction(async transactionalEntityManager => {
      const newProject = transactionalEntityManager.create(Project, {
        title: dto.title,
        description: dto.description,
        intern: intern,
        mentor: mentor,
      });

      const savedProject = await transactionalEntityManager.save(newProject);

      const milestones: Milestone[] = [];
      // Assuming dto.milestones has { title, tasks: [{ title, dueDate }] } structure
      for (const milestoneDto of dto.milestones || []) {
        const newMilestone = transactionalEntityManager.create(Milestone, {
          title: milestoneDto.title,
          project: savedProject,
        });

        const savedMilestone = await transactionalEntityManager.save(newMilestone);

        // Assuming Task and TaskStatus are correctly imported
        const tasks: Task[] = [];
        for (const taskDto of milestoneDto.tasks || []) {
          const newTask = transactionalEntityManager.create(Task, {
            title: taskDto.title,
            dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
            status: TaskStatus.TODO, // Assumes TaskStatus is available
            milestone: savedMilestone,
            assignee: intern,
          });
          tasks.push(newTask);
        }
        await transactionalEntityManager.save(tasks);

        // Update relations for response (TypeORM expects correct types here)
        savedMilestone.tasks = tasks; 
        milestones.push(savedMilestone);
      }

      savedProject.milestones = milestones;
      return savedProject;
    });
  }

  async getProjectsByMentor(mentorId: string): Promise<ProjectDetailsDto[]> { // <-- Changed return type
    console.log(`[ProjectsService] Explicitly fetching projects for Mentor ID: ${mentorId}`);
    
    try {
        const rawProjects = await this.projectRepository.find({
            where: { mentor: { id: mentorId } },
            // Load ALL relations for complete mapping
            relations: [
                'intern', 'mentor', 
                'milestones', 
                'milestones.tasks', 
                'interns',
                'milestones.tasks.assignee' // Ensure deep nesting is loaded
            ],
            order: { title: 'ASC' },
        });

        if (!rawProjects || rawProjects.length === 0) {
            return [];
        }

       const mappedProjects: ProjectDetailsDto[] = rawProjects.map(project => ({
            id: project.id,
            title: project.title,
            description: project.description || null,
            status: project.status,

            // 🔥 FIX: Use the safe mapper function
            intern: mapUserBasic(project.intern), 
            mentor: mapUserBasic(project.mentor),

          

            // Map Milestones and their Tasks
            milestones: project.milestones?.map(milestone => ({
                id: milestone.id,
                title: milestone.title,
                createdAt: milestone.createdAt, 
                tasks: milestone.tasks?.map(task => ({
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    dueDate: task.dueDate || null, 
                    assignee: mapUserBasic(task.assignee), // 🔥 FIX: Use safe mapper here too
                })) || [],
            })) || [],
        }));

        return mappedProjects;

    } catch (error) {
        console.error(`[ProjectsService] FATAL MAPPING/DB ERROR for Mentor ${mentorId}:`, error);
        // Throw an explicit server-side error for better client debugging
        throw new InternalServerErrorException('Project data could not be processed due to a mapping error.');
    }
}
  
async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      // Load relations to show intern/mentor info on the frontend
      relations: [
        'interns', 
        'mentor', 
       //'milestones'
      ],
      order: { title: 'ASC' }
    });
  }


  async getProjectById(
    projectId: string,
    mentorId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, mentor: { id: mentorId } },
      relations: [
        'intern',
        'milestones',
        'milestones.tasks',
        'milestones.tasks.assignee',
      ],
    });
    if (!project) {
      throw new NotFoundException(
        `Project with ID "${projectId}" not found or you are not authorized to view it.`,
      );
    }
    return project;
  }

  async updateProject(
    projectId: string,
    dto: CreateProjectDto,
    mentorId: string,
  ): Promise<Project> {
    const project = await this.getProjectById(projectId, mentorId);

    const intern = await this.userRepository.findOneBy({ id: dto.internId });
    if (!intern) {
      throw new NotFoundException('Intern not found.');
    }

    return this.entityManager.transaction(async transactionalEntityManager => {
      project.title = dto.title;
      project.description = dto.description;
      project.intern = intern;
      await transactionalEntityManager.save(Project, project);

      // Nuke and pave: Delete all old milestones (and their cascading tasks)
      await transactionalEntityManager.delete(Milestone, {
        project: { id: project.id },
      });

      const milestones: Milestone[] = [];
      for (const milestoneDto of dto.milestones || []) {
        const newMilestone = transactionalEntityManager.create(Milestone, {
          title: milestoneDto.title,
          project: project,
        });

        const savedMilestone = await transactionalEntityManager.save(newMilestone);

        const tasks: Task[] = [];
        for (const taskDto of milestoneDto.tasks || []) {
          const newTask = transactionalEntityManager.create(Task, {
            title: taskDto.title,
            dueDate: taskDto.dueDate ? new Date(taskDto.dueDate) : undefined,
            status: TaskStatus.TODO,
            milestone: savedMilestone,
            assignee: intern,
          });
          tasks.push(newTask);
        }
        await transactionalEntityManager.save(tasks);
        savedMilestone.tasks = tasks; // Update relation array
        milestones.push(savedMilestone);
      }

      project.milestones = milestones; // Update project relation array
      return project;
    });
  }

  async getTasksForIntern(internId: string): Promise<Task[]> {
    // Requires TaskRepository to be injected
    return this.taskRepository.find({
      where: { assignee: { id: internId } },
      relations: ['milestone', 'milestone.project'],
      order: { dueDate: 'ASC' },
    });
  }

  async findProjectById(projectId: string, mentorId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, mentor: { id: mentorId } },
      relations: ['mentor'],
    });
    if (!project) {
      throw new NotFoundException(
        `Project with ID "${projectId}" not found or unauthorized.`,
      );
    }
    return project;
  }
async findAllWithDetails(): Promise<Project[]> {
        console.log('[ProjectsService] findAllWithDetails called'); // Add log
        try {
            const projects = await this.projectRepository.find({
                // Load relations needed for the HR dashboard table
                relations: [
                    'mentor',   // Load the mentor user object
                    'interns',  // Load the array of intern user objects
                    // 'milestones', // Optional: Load milestones if needed
                    // 'tasks'    // Optional: Load tasks if needed (might be too much data)
                ],
                order: {
                    title: 'ASC', // Example ordering
                },
            });
            console.log(`[ProjectsService] Found ${projects.length} projects with details.`);
            return projects;
        } catch (error) {
            console.error('[ProjectsService] Error fetching projects with details:', error);
            throw new InternalServerErrorException('Failed to fetch projects from database.');
        }
    }

async findOne(
    projectId: string,
    userId: string, // ID of the user MAKING the request
    relations: string[] = [], // Allow specifying extra relations if needed
  ): Promise<ProjectDetailsDto> {
    console.log(`[ProjectsService] findOne called for projectId: ${projectId} by userId: ${userId}`);

    // 1. Fetch the project by its ID, ensuring the mentor is loaded for the check
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      // Ensure 'mentor' is always loaded, plus any extras requested
  relations: [
        'mentor', 
        'interns', 
        'milestones', 
       // 'milestones.tasks', // Load tasks nested under milestones
        // Add other necessary relations (e.g., tasks.assignee)
      ],    });
    console.log(`[ProjectsService] Result from DB query for project ${projectId}:`, project ? `Found: ${project.title}` : 'Not Found');

    if (!project) {
      console.error(`[ProjectsService] Project NOT FOUND in DB for ID: ${projectId}`);
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    // We need the role of the user making the request
    const requestingUser = await this.userRepository.findOneBy({ id: userId });
    if (!requestingUser) {
       // This shouldn't happen if AuthGuard is working, but it's a safety check
       console.error(`[ProjectsService] Requesting user ${userId} not found during permission check.`);
       throw new UnauthorizedException('Requesting user not found.');
    }
    console.log(`[ProjectsService] Checking permission for user ${userId} (Role: ${requestingUser.role}) on project ${projectId} (Mentor: ${project.mentor?.id})`);

    // Allow access if the user is HR OR if they are the specific mentor assigned to the project
    const isMentorOfProject = project.mentor?.id === userId; // Check if mentor exists before comparing ID
    const isHr = requestingUser.role === UserRole.HR;

    if (!isHr && !isMentorOfProject) {
      console.warn(`[ProjectsService] Unauthorized attempt by user ${userId} to access project ${projectId}`);
      throw new UnauthorizedException(
        'You do not have permission to view this project.',
      );
    }

   console.log('[DEBUG] Raw Project Data:', JSON.stringify(project, null, 2));
    // 4. Return the found project
   return {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        
        // ✅ FIX: Use optional chaining to safely access the ID.
        mentor: project.mentor ? {
            id: project.mentor.id,
            firstName: project.mentor.firstName,
            lastName: project.mentor.lastName,
            email: project.mentor.email,
        } : null,
        
        // Handle intern or interns array safely
        intern: project.intern ? {
            id: project.intern.id,
            email: project.intern.email,
            // ...
        } : null,
        
        // Milestone logic: Ensure tasks and assignees are handled safely too
        milestones: project.milestones.map(milestone => ({
            ...milestone,
            tasks: milestone.tasks.map(task => ({
                ...task,
                // ✅ FIX: Use optional chaining here for the task assignee
                assignee: task.assignee ? {
                    id: task.assignee.id,
                    firstName: task.assignee.firstName,
                    email: task.assignee.email,
                } : null,
            })),
        })),
    } as ProjectDetailsDto; // Cast to your expected DTO structure
}

  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    userId: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignee'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }

    if (!task.assignee || task.assignee.id !== userId) {
      throw new UnauthorizedException(
        'You can only update the status of your own tasks.',
      );
    }

    task.status = newStatus;
    return this.taskRepository.save(task);
  }
}