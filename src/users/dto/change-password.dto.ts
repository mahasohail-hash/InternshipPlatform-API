import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

// This DTO defines ONLY the data the backend API needs
export class ChangePasswordDto {

  @IsString()
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  
  newPassword!: string;

 
}

