import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { buildOtpEmailHtml } from "./templates/otp-email.template";
import { buildPasswordResetEmailHtml } from "./templates/password-reset-email.template";
import { SmtpConfigService } from "./smtp-config.service";

const OTP_EXPIRES_MINUTES = 10;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly smtpConfigService: SmtpConfigService) {}

  async sendOtpEmail(params: {
    to: string;
    firstName: string;
    otp: string;
  }) {
    const config = await this.smtpConfigService.getConfig();
    if (!config || !config.smtpEnabled) {
      throw new Error(
        "SMTP is not configured or disabled. Configure it in admin Settings > Config > SMTP.",
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

    const html = buildOtpEmailHtml({
      firstName: params.firstName,
      otp: params.otp,
      expiresMinutes: OTP_EXPIRES_MINUTES,
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Muakhah" <${config.smtpEmailUser}>`,
      to: params.to,
      subject: `${params.otp} is your Muakhah verification code`,
      html,
      text: `Your Muakhah verification code is ${params.otp}. It expires in ${OTP_EXPIRES_MINUTES} minutes.`,
    };

    if (config.smtpBcc) {
      mailOptions.bcc = config.smtpBcc;
    }

    await transporter.sendMail(mailOptions);
    this.logger.log(`OTP email sent to ${params.to}`);
  }

  async sendPasswordResetEmail(params: {
    to: string;
    firstName: string;
    otp: string;
  }) {
    const config = await this.smtpConfigService.getConfig();
    if (!config || !config.smtpEnabled) {
      throw new Error(
        "SMTP is not configured or disabled. Configure it in admin Settings > Config > SMTP.",
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

    const html = buildPasswordResetEmailHtml({
      firstName: params.firstName,
      otp: params.otp,
      expiresMinutes: OTP_EXPIRES_MINUTES,
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Muakhah" <${config.smtpEmailUser}>`,
      to: params.to,
      subject: `${params.otp} is your Muakhah password reset code`,
      html,
      text: `Your Muakhah password reset code is ${params.otp}. It expires in ${OTP_EXPIRES_MINUTES} minutes.`,
    };

    if (config.smtpBcc) {
      mailOptions.bcc = config.smtpBcc;
    }

    await transporter.sendMail(mailOptions);
    this.logger.log(`Password reset email sent to ${params.to}`);
  }
}
