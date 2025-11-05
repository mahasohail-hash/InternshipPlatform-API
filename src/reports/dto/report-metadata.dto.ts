import { IsString, IsNotEmpty, IsDateString, IsUUID, IsOptional } from 'class-validator';

export class ReportMetadataDto {
    @IsUUID('4', { message: 'Report ID must be a valid UUID.' })
    reportId!: string;

    @IsString({ message: 'Report name must be a string.' })
    @IsNotEmpty({ message: 'Report name cannot be empty.' })
    reportName!: string;

    @IsUUID('4', { message: 'Generator user ID must be a valid UUID.' })
    @IsNotEmpty({ message: 'Generator user ID is required.' })
    generatedByUserId!: string;

    @IsDateString({}, { message: 'Generated date must be a valid ISO 8601 date string.' })
    generatedAt!: string;

    @IsUUID('4', { message: 'Intern ID for report must be a valid UUID.' })
    @IsNotEmpty({ message: 'Intern ID for report is required.' })
    forInternId!: string;

    @IsString({ message: 'Report version must be a string.' })
    @IsOptional()
    version?: string; // e.g., "1.0", "Draft"
}