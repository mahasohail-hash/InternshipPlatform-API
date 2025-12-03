// src/mailer/dto/send-mail.dto.ts
import { IsEmail, IsNotEmpty, IsOptional } from "class-validator";

export class SendEmailDto {
  @IsEmail()
    to!: string;

  @IsNotEmpty()
    subject!: string;

  @IsNotEmpty()
    html!: string;

  @IsOptional()
  text?: string;
}
