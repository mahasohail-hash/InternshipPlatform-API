import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string.' })
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword!: string;

  @IsString({ message: 'New password must be a string.' })
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  // Optional: Add regex for strong password requirements
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
  //   message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
  // })
  newPassword!: string;
}