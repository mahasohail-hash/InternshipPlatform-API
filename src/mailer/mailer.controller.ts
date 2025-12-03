// src/mailer/mailer.controller.ts
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { MailerService } from "./mailer.service";
import { SendBulkEmailDto } from "./dto/send-bulk.dto";
import { SendEmailDto } from "./dto/send-mail.dto";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "@/auth/decorators/roles.decorator";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { UserRole } from "@/common/enums/user-role.enum";

@Controller("api/email")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MailerController {
  constructor(private mailerService: MailerService) {}

  @Post("send")
  @Roles(UserRole.HR)
  async sendEmail(@Body() dto: SendEmailDto) {
    // sendMail now returns 'sent' | 'failed'
    const status = await this.mailerService.sendMail(dto);
    return { status, to: dto.to };
  }

  @Post("send-bulk")
  @Roles(UserRole.HR)
  async sendBulkEmail(@Body() dto: SendBulkEmailDto) {
    const results = await this.mailerService.sendBulkEmail(
      dto.role,
      dto.subject,
      dto.message
    );
    return { results };
  }
}
