// src/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsEnum(UserRole) @IsNotEmpty() role!: UserRole;
}