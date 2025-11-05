import { IsUUID, IsEnum, IsOptional, IsNumber, IsNotEmpty, IsString, Min, Max } from 'class-validator';
import { EvaluationType } from '../entities/evaluation.entity'; // CRITICAL FIX: Assuming EvaluationType is defined here

export class CreateEvaluationDto {
    @IsUUID('4', { message: 'Intern ID must be a valid UUID.' })
    @IsNotEmpty({ message: 'Intern ID is required.' })
    internId!: string; // Who is being evaluated

    @IsOptional()
    @IsUUID('4', { message: 'Mentor ID must be a valid UUID.' })
    mentorId?: string; // Optional if Intern submits a Self-Review (and will be derived from token if mentor)

    @IsOptional()
    @IsNumber({}, { message: 'Score must be a number.' })
    @Min(1, { message: 'Score must be at least 1.' })
    @Max(5, { message: 'Score must be at most 5.' })
    score?: number; // 1-5 rating

    @IsString({ message: 'Feedback text must be a string.' })
    @IsNotEmpty({ message: 'Feedback text cannot be empty.' })
    feedbackText!: string; // CRITICAL FIX: THIS MUST EXIST

    @IsEnum(EvaluationType, { message: 'Invalid evaluation type.' })
    @IsNotEmpty({ message: 'Evaluation type is required.' })
    type!: EvaluationType;
}