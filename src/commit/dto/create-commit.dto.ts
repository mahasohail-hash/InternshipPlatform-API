import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateCommitDto {
  @IsString() @IsNotEmpty() sha!: string;
  @IsString() @IsNotEmpty() message!: string;
  @IsString() @IsNotEmpty() author!: string;
  @IsNumber() additions!: number;
  @IsNumber() deletions!: number;
}
