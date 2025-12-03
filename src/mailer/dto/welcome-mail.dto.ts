import { IsEmail, IsString, IsNotEmpty } from "class-validator";

export class WelcomeMailDto {
  @IsEmail()
    email!: string;

  @IsString()
    @IsNotEmpty()
    name!: string;
}