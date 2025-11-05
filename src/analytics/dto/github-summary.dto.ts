import { IsNumber, IsDateString, IsString, IsNotEmpty } from 'class-validator';

// This DTO defines the shape of a GitHub summary for an intern.
// It's a snapshot, or an aggregation.
export class GitHubSummaryDto {
    @IsNumber()
    totalCommits!: number;

    @IsNumber()
    totalAdditions!: number; // Total lines added
    
    @IsNumber()
    totalDeletions!: number; // Total lines deleted

    // Add more fields as needed for the dashboard summary
    // @IsDateString()
    // lastUpdated?: Date; // Last time data was fetched/updated

    // @IsString()
    // @IsNotEmpty()
    // internGithubUsername!: string; // The username for which this summary applies
}