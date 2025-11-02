import { IsString, IsNotEmpty, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { EvaluationType } from '../entities/evaluation.entity'; // Ensure this path is correct

export class CreateEvaluationDto {
  @IsEnum(EvaluationType, { message: 'Type must be a valid evaluation type (e.g., Weekly Note).' })
  @IsNotEmpty({ message: 'Evaluation type is required.' })
  type!: EvaluationType;

  @IsNumber({}, { message: 'Score must be a number.' })
  @Min(1, { message: 'Score must be at least 1.' })
  @Max(5, { message: 'Score cannot be greater than 5.' })
  @IsNotEmpty({ message: 'Score is required.' })
  score!: number;

  @IsString({ message: 'feedbackText must be a string' })
  @IsNotEmpty({ message: 'feedbackText should not be empty' })
  feedbackText!: string; 


  @IsNumber({}, { message: 'internId must be a number conforming to the specified constraints' })
  @IsNotEmpty({ message: 'Intern ID is required.' })
  internId!: number;
}

