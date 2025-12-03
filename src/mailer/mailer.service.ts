import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@/users/entities/users.entity";
import nodemailer, { SentMessageInfo } from "nodemailer";
import { UserRole } from "@/common/enums/user-role.enum";

@Injectable()
export class MailerService {
  private transporter;

  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: { filename: string; path: string }[];
  }): Promise<'sent' | 'failed'> {
    try {
      const info: SentMessageInfo = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });

      // Use accepted array from Nodemailer to determine status
      return info.accepted && info.accepted.length > 0 ? 'sent' : 'failed';
    } catch (err) {
      console.error("MailerService.sendMail error:", err);
      return 'failed';
    }
  }

  async sendBulkEmail(role: UserRole, subject: string, message: string) {
    const users = await this.usersRepository.find({
      where: { role: role as UserRole }, // cast to enum type
    });

    const results: { user: string; status: 'sent' | 'failed' }[] = [];

    for (const user of users) {
      if (user.email) {
        const status = await this.sendMail({
          to: user.email,
          subject,
          html: `<p>${message}</p>`,
        });
        results.push({ user: user.email, status });
      }
    }

    return results;
  }
}
