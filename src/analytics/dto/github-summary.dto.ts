import { IsNumber, IsDateString, IsString, IsNotEmpty } from 'class-validator';

// It's a snapshot, or an aggregation.
export class GitHubSummaryDto {
    @IsNumber()
    totalCommits!: number;

    @IsNumber()
    totalAdditions!: number; // Total lines added
    
    @IsNumber()
    totalDeletions!: number; // Total lines deleted

  
}