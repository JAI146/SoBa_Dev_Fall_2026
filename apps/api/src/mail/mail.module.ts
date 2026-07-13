import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SmtpConfig } from "../entities/smtp-config.entity";
import { MailService } from "./mail.service";
import { SmtpConfigService } from "./smtp-config.service";

@Module({
  imports: [TypeOrmModule.forFeature([SmtpConfig])],
  providers: [SmtpConfigService, MailService],
  exports: [SmtpConfigService, MailService],
})
export class MailModule {}
