// src/analytics/dto/github-summary.dto.ts

import { IsNumber, IsDateString } from 'class-validator';

export class GitHubSummaryDto {
    @IsNumber()
    totalCommits!: number;

    @IsNumber()
    linesChanged!: number; // Sum of lines added and deleted

    @IsDateString()
    lastUpdated!: Date;
}