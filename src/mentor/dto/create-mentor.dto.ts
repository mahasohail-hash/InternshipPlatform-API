import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateMentorDto {
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsEmail() @IsNotEmpty() email!: string;
}
