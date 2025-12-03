// src/mailer/dto/send-bulk.dto.ts
import { IsEnum, IsNotEmpty } from "class-validator";
import { UserRole } from "@/common/enums/user-role.enum";

export class SendBulkEmailDto {
  @IsEnum(UserRole)
    role!: UserRole;

  @IsNotEmpty()
    subject!: string;

  @IsNotEmpty()
    message!: string;
}
