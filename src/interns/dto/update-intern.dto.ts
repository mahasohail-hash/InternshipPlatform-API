export class UpdateInternDto {
  readonly name?: string;             // Update name if provided
  readonly mentorIds?: string[];      // Replace or update mentors
  readonly projectIds?: string[];     // Replace or update projects
  readonly checklistIds?: string[];   // Replace or update checklists
}
