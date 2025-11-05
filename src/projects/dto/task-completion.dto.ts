// src/projects/dto/task-completion.dto.ts

import { IsNumber } from 'class-validator';

export class TaskCompletionDto {
    @IsNumber()
    totalTasks!: number;

    @IsNumber()
    completedTasks!: number;

    @IsNumber()
    completionRate!: number; // Percentage as a decimal (e.g., 0.90)
}