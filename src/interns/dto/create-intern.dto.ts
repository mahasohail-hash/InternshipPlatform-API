export class CreateInternDto {
  readonly name!: string;              // Intern full name
  readonly hrId!: string;              // HR assigned
  readonly mentorIds?: string[];      // Optional mentors
  readonly projectIds?: string[];     // Optional projects
  readonly checklistIds?: string[];   // Optional checklists
}
