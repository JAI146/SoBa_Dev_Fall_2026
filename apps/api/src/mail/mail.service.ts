import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SmtpConfigService } from './smtp-config.service';
import {
  buildPasswordResetEmailHtml,
  buildVerificationEmailHtml,
} from './templates/auth-code-email.template';

interface CodeEmailParams {
  to: string;
  firstName: string;
  otp: string;
  expiresMinutes: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly smtpConfigService: SmtpConfigService) {}

  async sendVerificationEmail(params: CodeEmailParams): Promise<void> {
    await this.send({
      to: params.to,
      subject: `${params.otp} is your PurposeMint confirmation code`,
      text: `Hi ${params.firstName}, your PurposeMint confirmation code is ${params.otp}. It works for the next ${params.expiresMinutes} minutes.`,
      html: buildVerificationEmailHtml(params),
    });
  }

  async sendPasswordResetEmail(params: CodeEmailParams): Promise<void> {
    await this.send({
      to: params.to,
      subject: `${params.otp} is your PurposeMint password reset code`,
      text: `Hi ${params.firstName}, your PurposeMint password reset code is ${params.otp}. It works for the next ${params.expiresMinutes} minutes.`,
      html: buildPasswordResetEmailHtml(params),
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const config = await this.smtpConfigService.getConfig();
    if (!config || !config.smtpEnabled) {
      throw new Error('SMTP is not configured or is disabled');
    }

    const fromEmail = config.fromEmail?.trim();
    if (!fromEmail) {
      throw new Error(
        'SMTP fromEmail is not set. Set INITIAL_SMTP_FROM_EMAIL to a verified sender address (not the SMTP username) and re-seed smtp_config.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpServer,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpEmailUser,
        pass: config.smtpEmailPassword,
      },
    });

    await transporter.sendMail({
      from: `"PurposeMint" <${fromEmail}>`,
      to: message.to,
      bcc: config.smtpBcc ?? undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    // Never log the subject or body — both carry the one-time code.
    this.logger.log(`Sent an authentication email to ${message.to}`);
  }
}
