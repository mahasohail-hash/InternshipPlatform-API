// src/projects/dto/task-completion.dto.ts

import { IsNumber, Min, Max } from 'class-validator';

export class TaskCompletionDto {
  @IsNumber()
  @Min(0)
  totalTasks!: number;

  @IsNumber()
  @Min(0)
  completedTasks!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  completionRate!: number; // Percentage from 0 to 100
}
