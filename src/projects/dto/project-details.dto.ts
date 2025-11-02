// src/projects/dto/project-details.dto.ts

import { UserBasicDto } from '../../users/dto/user-basic.dto'; 


export class TaskBasicDto {
    id!: string;
    title!: string;
    status!: string;
    assignee?: UserBasicDto | null;
    dueDate?: Date | string | null;
}

export class MilestoneBasicDto { 
    id!: string;
    title!: string;
    tasks!: TaskBasicDto[]; 
    createdAt!: Date | string;
}

// --- 3. The Main Project DTO ---
export class ProjectDetailsDto { 
    id!: string;
    title!: string;
    description?: string | null;
    status!: string;
    
    mentor?: UserBasicDto | null;
    intern?: UserBasicDto | null;
    interns?: UserBasicDto[] | null;
    
    milestones!: MilestoneBasicDto[] | null; 
}