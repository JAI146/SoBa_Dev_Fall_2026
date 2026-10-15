import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SmtpConfigService } from '../mail/smtp-config.service';
export class EmailDeliveryError extends Error {
  constructor(public readonly uncertain: boolean) {
    super(
      uncertain
        ? 'Email outcome is unconfirmed. Check the SMTP provider before sending again.'
        : 'SMTP rejected the email. Check sender configuration and recipient.',
    );
  }
}
@Injectable()
export class NotificationEmailSender {
  constructor(private readonly config: SmtpConfigService) {}
  async ready() {
    const config = await this.config.getConfig();
    return Boolean(
      config?.smtpEnabled &&
      config.smtpServer &&
      config.fromEmail &&
      config.smtpEmailUser &&
      config.smtpEmailPassword,
    );
  }
  async send(to: string, subject: string, text: string): Promise<void> {
    const config = await this.config.getConfig();
    if (!config?.smtpEnabled || !config.fromEmail || !config.smtpEmailPassword)
      throw new EmailDeliveryError(false);
    const transport = nodemailer.createTransport({
      host: config.smtpServer,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      requireTLS: config.smtpPort !== 465,
      auth: { user: config.smtpEmailUser, pass: config.smtpEmailPassword },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    try {
      const info: unknown = await transport.sendMail({
        from: { name: 'PurposeMint', address: config.fromEmail },
        to,
        subject,
        text,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const accepted = (info as { accepted?: unknown }).accepted;
      if (
        !Array.isArray(accepted) ||
        !accepted.some(
          (address: unknown) =>
            typeof address === 'string' &&
            address.toLowerCase() === to.toLowerCase(),
        )
      )
        throw new EmailDeliveryError(false);
    } catch (error: unknown) {
      if (error instanceof EmailDeliveryError) throw error;
      const code = (error as { code?: unknown }).code;
      throw new EmailDeliveryError(
        !['EAUTH', 'EENVELOPE', 'EMESSAGE', 'ECONNECTION', 'EDNS'].includes(
          String(code),
        ),
      );
    } finally {
      transport.close();
    }
  }
}
