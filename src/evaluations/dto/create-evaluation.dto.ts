import { IsUUID, IsEnum, IsOptional, IsNumber, IsNotEmpty, IsString, Min, Max } from 'class-validator';
import { EvaluationType } from '../entities/evaluation.entity';

export class CreateEvaluationDto {
    @IsUUID('4', { message: 'Intern ID must be a valid UUID.' })
    @IsNotEmpty({ message: 'Intern ID is required.' })
    internId!: string; // The intern being evaluated

    @IsOptional()
    @IsUUID('4', { message: 'Mentor ID must be a valid UUID.' })
    mentorId?: string; // Optional for self-reviews, otherwise mentor ID is required

    @IsOptional()
    @IsNumber({}, { message: 'Score must be a number.' })
    @Min(1, { message: 'Score must be at least 1.' })
    @Max(5, { message: 'Score must be at most 5.' })
    score?: number; // Rating scale from 1 to 5

    @IsString({ message: 'Feedback text must be a string.' })
    @IsNotEmpty({ message: 'Feedback text cannot be empty.' })
    feedbackText!: string; // Feedback content

    @IsEnum(EvaluationType, { message: 'Invalid evaluation type.' })
    @IsNotEmpty({ message: 'Evaluation type is required.' })
    type!: EvaluationType; // Weekly, Midpoint, Final, or Self
}
