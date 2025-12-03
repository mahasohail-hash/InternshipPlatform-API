// src/mailer/mailer.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/users/entities/users.entity';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // needed for repository injection
  providers: [MailerService],
  controllers: [MailerController],
  exports: [MailerService], // <-- this allows other modules to inject MailerService
})
export class MailerModule {}
