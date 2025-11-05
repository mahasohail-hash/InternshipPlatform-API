import { UserBasicDto } from '../../users/dto/user-basic.dto'; // CRITICAL FIX: Correct import path for UserBasicDto

// Basic Task DTO for nesting inside MilestoneBasicDto
export class TaskBasicDto {
    id!: string;
    title!: string;
    status!: string;
    assignee?: UserBasicDto | null; // Assignee can be null
    dueDate?: Date | string | null; // Date can be null
}

// Basic Milestone DTO for nesting inside ProjectDetailsDto
export class MilestoneBasicDto {
    id!: string;
    title!:string;
    tasks!: TaskBasicDto[]; // Array of tasks
createdAt!: Date | string; // Date
updatedAt?: Date | string; // Add if entity has it
}
// The Main Project Details DTO for detailed project views
export class ProjectDetailsDto {
id!: string;
title!: string;
description?: string | null;
status!: string;
mentor?: UserBasicDto | null; // Mentor can be null
intern?: UserBasicDto | null; // Primary intern can be null
// interns?: UserBasicDto[] | null; // If you have a ManyToMany relation for multiple interns

milestones!: MilestoneBasicDto[] | null; // Milestones can be null or empty array
}