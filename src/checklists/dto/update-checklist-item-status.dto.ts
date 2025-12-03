import { IsBoolean } from 'class-validator';

export class UpdateChecklistItemStatusDto {
  @IsBoolean()
  isCompleted!: boolean; // true if the checklist item is completed, false otherwise
}
