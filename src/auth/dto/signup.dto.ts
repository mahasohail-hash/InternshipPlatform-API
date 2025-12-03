import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail()
    email!: string;

  @IsNotEmpty()
     firstName!: string;

       @IsNotEmpty()
  lastName!: string;

  @IsNotEmpty()
    @MinLength(6)
    password!: string;

}
