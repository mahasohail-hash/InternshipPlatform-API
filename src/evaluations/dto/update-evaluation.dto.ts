import { PartialType } from '@nestjs/mapped-types';
import { CreateEvaluationDto } from './create-evaluation.dto';
import { IsOptional, IsNumber, Min, Max, IsString, IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { EvaluationType } from '../entities/evaluation.entity';

export class UpdateEvaluationDto extends PartialType(CreateEvaluationDto) {
    @IsOptional()
    @IsUUID('4', { message: 'Intern ID must be a valid UUID.' })
    internId?: string;

    @IsOptional()
    @IsUUID('4', { message: 'Mentor ID must be a valid UUID.' })
    mentorId?: string;

    @IsOptional()
    @IsNumber({}, { message: 'Score must be a number.' })
    @Min(1, { message: 'Score must be at least 1.' })
    @Max(5, { message: 'Score must be at most 5.' })
    score?: number;

    @IsOptional()
    @IsString({ message: 'Feedback text must be a string.' })
    @IsNotEmpty({ message: 'Feedback text cannot be empty if provided.' })
    feedbackText?: string;

    @IsOptional()
    @IsEnum(EvaluationType, { message: 'Invalid evaluation type.' })
    type?: EvaluationType;
}
