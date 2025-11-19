import { IsOptional, IsString } from 'class-validator';

export class UpdateGithubDto {
  @IsOptional()
  @IsString()
  githubUsername?: string;
}
