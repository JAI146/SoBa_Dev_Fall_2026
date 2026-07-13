import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { buildOtpEmailHtml } from './templates/otp-email.template';
import { buildPasswordResetEmailHtml } from './templates/password-reset-email.template';
import { SmtpConfigService } from './smtp-config.service';

const OTP_EXPIRES_MINUTES = 10;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly smtpConfigService: SmtpConfigService) {}

  async sendOtpEmail(params: { to: string; firstName: string; otp: string }) {
    await this.send({
      to: params.to,
      subject: params.otp + ' is your PurposeMint verification code',
      text:
        'Your PurposeMint verification code is ' +
        params.otp +
        '. It expires in 10 minutes.',
      html: buildOtpEmailHtml({
        firstName: params.firstName,
        otp: params.otp,
        expiresMinutes: OTP_EXPIRES_MINUTES,
      }),
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    firstName: string;
    otp: string;
  }) {
    await this.send({
      to: params.to,
      subject: params.otp + ' is your PurposeMint password reset code',
      text:
        'Your PurposeMint password reset code is ' +
        params.otp +
        '. It expires in 10 minutes.',
      html: buildPasswordResetEmailHtml({
        firstName: params.firstName,
        otp: params.otp,
        expiresMinutes: OTP_EXPIRES_MINUTES,
      }),
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const config = await this.smtpConfigService.getConfig();
    if (!config || !config.smtpEnabled) {
      throw new Error('SMTP is not configured or is disabled');
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
      from: '"PurposeMint" <' + config.smtpEmailUser + '>',
      to: message.to,
      bcc: config.smtpBcc ?? undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    this.logger.log('Authentication email sent to ' + message.to);
  }
}
