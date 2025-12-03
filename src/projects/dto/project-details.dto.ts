import { UserBasicDto } from '../../users/dto/user-basic.dto'; // Correct import

// Basic Task DTO for nesting inside MilestoneBasicDto
export class TaskBasicDto {
  id!: string;
  title!: string;
  status!: string;
  assignee?: UserBasicDto | null; // Task can be unassigned
  dueDate?: Date | string | null; // Nullable due date
}

// Basic Milestone DTO for nesting inside ProjectDetailsDto
export class MilestoneBasicDto {
  id!: string;
  title!: string;
  description?: string | null;
  dueDate?: Date | string | null; // Nullable
  tasks!: TaskBasicDto[]; // Array of tasks
  createdAt!: Date | string;
  updatedAt?: Date | string;
}

// Main Project Details DTO for detailed project view
export class ProjectDetailsDto {
  id!: string;
  title!: string;
  description?: string | null;
  status!: string;

  mentor?: UserBasicDto | null; // Mentor assigned to project
  intern?: UserBasicDto | null; // Primary intern assigned
  interns?: UserBasicDto[] | null; // Optional: multiple interns if ManyToMany

  milestones!: MilestoneBasicDto[] | null; // Milestones under the project
}
