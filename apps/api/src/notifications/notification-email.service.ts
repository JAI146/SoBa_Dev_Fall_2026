import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  AuditAction,
  UserStatus,
  UserType,
  type NotificationEmailInput,
  type NotificationSmtpInput,
} from '@purposemint/contracts';
import { User } from '../entities/user.entity';
import { NotificationJob } from '../entities/notification-job.entity';
import { NotificationCategory } from '../entities/notification-category.entity';
import { SmtpConfig } from '../entities/smtp-config.entity';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import {
  NotificationEmailSender,
  EmailDeliveryError,
} from './notification-email.sender';
import { allowedAt, settingsFor } from './notification-policy';
import { isCurrentReengagement } from './re-engagement-policy';
import {
  reengagementEmail,
  customerAppUrl,
  formattedNotificationEmail,
} from './notification-email-template';
const isDemo = (email: string) =>
  /@[^@]+\.(local|invalid|test|example)$/i.test(email) ||
  /@(example\.com|example\.org|example\.net)$/i.test(email);
@Injectable()
export class NotificationEmailService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly sender: NotificationEmailSender,
    private readonly audit: AuditService,
  ) {}
  async smtp() {
    const config = await this.db
      .getRepository(SmtpConfig)
      .findOne({ where: {}, order: { updatedAt: 'DESC' } });
    return {
      configured: await this.sender.ready(),
      settings: config
        ? {
            smtpServer: config.smtpServer,
            smtpPort: config.smtpPort,
            smtpEmailUser: config.smtpEmailUser,
            fromEmail: config.fromEmail ?? '',
            smtpEnabled: config.smtpEnabled,
            hasPassword: Boolean(config.smtpEmailPassword),
          }
        : null,
    };
  }
  async configure(principal: AuthPrincipal, input: NotificationSmtpInput) {
    await this.db.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        'notification-smtp-settings',
      ]);
      const old = await manager.findOne(SmtpConfig, {
        where: {},
        order: { updatedAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        input.smtpEnabled &&
        !input.smtpEmailPassword &&
        !old?.smtpEmailPassword
      )
        throw new BadRequestException(
          'An SMTP password is required to enable email.',
        );
      await manager.save(
        SmtpConfig,
        manager.create(SmtpConfig, {
          ...old,
          ...input,
          smtpEmailPassword:
            input.smtpEmailPassword ?? old?.smtpEmailPassword ?? '',
          smtpBcc: old?.smtpBcc ?? null,
        }),
      );
      await this.audit.recordTransactional(manager, {
        action: AuditAction.NOTIFICATION_SMTP_UPDATED,
        actorUserId: principal.userId,
        entityType: 'notification_email',
        metadata: { enabled: input.smtpEnabled },
      });
    });
    return this.smtp();
  }
  async test(principal: AuthPrincipal, to: string) {
    if (isDemo(to))
      throw new BadRequestException(
        'Use a real inbox. Demo addresses cannot receive email.',
      );
    if (!(await this.sender.ready()))
      throw new BadRequestException('Configure and enable SMTP first.');
    await this.db.transaction((manager) =>
      this.audit.recordTransactional(manager, {
        action: AuditAction.NOTIFICATION_EMAIL_TEST,
        actorUserId: principal.userId,
        actorType: 'admin',
        entityType: 'notification_email',
        metadata: { operation: 'test_requested' },
      }),
    );
    try {
      await this.sender.send(
        to,
        'PurposeMint email test',
        'Your PurposeMint email connection is working.',
      );
    } catch (error) {
      if (error instanceof EmailDeliveryError)
        throw new BadRequestException(error.message);
      throw error;
    }
    return {
      message:
        'SMTP accepted the test email. Check your inbox and spam folder.',
    };
  }
  async send(
    principal: AuthPrincipal,
    id: string,
    input: NotificationEmailInput,
  ) {
    return this.deliver(principal, id, input);
  }
  /** Internal worker only; no public endpoint accepts HTML or an automated flag. */
  async sendAutomated(id: string, appUrl: string | null) {
    const safeUrl = appUrl
      ? customerAppUrl(appUrl, process.env.NODE_ENV === 'production')
      : null;
    if (appUrl && !safeUrl)
      throw new BadRequestException('A valid customer app URL is required.');
    return this.deliver(null, id, undefined, safeUrl);
  }
  private async deliver(
    principal: AuthPrincipal | null,
    id: string,
    input?: NotificationEmailInput,
    appUrl?: string | null,
  ) {
    const automatic = principal === null;
    if (!(await this.sender.ready()))
      throw new BadRequestException(
        'Configure and enable SMTP before sending email.',
      );
    const recipient = await this.db.transaction(async (manager) => {
      const original = await manager.findOneBy(NotificationJob, { id });
      if (!original) throw new NotFoundException('Notification not found.');
      const user = await manager.findOne(User, {
        where: { id: original.userId, userType: UserType.CUSTOMER },
        lock: { mode: 'pessimistic_write' },
      });
      const job = await manager.findOne(NotificationJob, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user || !job)
        throw new NotFoundException('Customer or notification not found.');
      if (
        input &&
        input.recipientEmail.toLowerCase() !== user.email.toLowerCase()
      )
        throw new BadRequestException(
          'The recipient address changed. Refresh Activity and review the new address before sending.',
        );
      if (job.channel !== 'email')
        throw new BadRequestException(
          'This record is a push notification. Push requires provider and device registration.',
        );
      if (job.mandatory)
        throw new BadRequestException(
          'Required account and transaction messages are sent by their own workflows. Choose an optional category.',
        );
      if (
        automatic &&
        (job.eventType !== 're_engagement' ||
          job.categoryKey !== 'product_communications')
      )
        throw new BadRequestException(
          'Only inactivity reminders have automatic delivery rules.',
        );
      if (
        [
          'sent',
          'delivered',
          'cancelled',
          'processing',
          'delivery_uncertain',
        ].includes(job.status)
      )
        throw new BadRequestException(
          'This notification cannot be sent again.',
        );
      if (job.attempts >= 5)
        throw new BadRequestException('Delivery attempt limit reached.');
      const defer = async (
        status: NotificationJob['status'],
        reason: string,
        until?: Date,
      ) => {
        job.status = status;
        job.reason = reason;
        if (until) job.scheduledAt = until;
        await manager.save(job);
        await this.audit.recordTransactional(manager, {
          action: AuditAction.NOTIFICATION_SEND_COMPLETED,
          actorType: 'system',
          entityType: 'notification',
          entityId: id,
          metadata: { channel: 'email', status, reason, automatic: true },
        });
        return null;
      };
      if (user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt) {
        if (automatic) return defer('suppressed', 'account_inactive');
        throw new BadRequestException(
          'Only active customers with verified email can receive these messages.',
        );
      }
      if (isDemo(user.email)) {
        if (automatic) return defer('suppressed', 'demo_address');
        throw new BadRequestException(
          'This customer has a demo address. Select a customer with a real inbox.',
        );
      }
      if (!isCurrentReengagement(job, user, new Date())) {
        if (automatic) return defer('cancelled', 'customer_active');
        throw new BadRequestException(
          'The customer has returned. This reminder is no longer eligible.',
        );
      }
      const categories = await manager.find(NotificationCategory),
        category = categories.find((item) => item.key === job.categoryKey);
      if (category?.mandatory)
        throw new BadRequestException(
          'Required messages are sent by their own workflows.',
        );
      const decision = category
        ? allowedAt(
            category,
            'email',
            settingsFor(
              user.notificationPreferences,
              categories,
              user.timeZone,
            ),
            new Date(),
          )
        : null;
      if (!decision?.allowed) {
        if (automatic)
          return defer(
            'suppressed',
            decision?.reason ?? 'category_unavailable',
          );
        throw new BadRequestException(
          'Customer preferences or category settings prevent this email.',
        );
      }
      if (
        job.scheduledAt.getTime() > Date.now() ||
        decision.scheduledAt.getTime() > Date.now() + 1000
      ) {
        if (automatic)
          return defer(
            'scheduled',
            decision.reason ?? 'quiet_hours',
            new Date(
              Math.max(
                job.scheduledAt.getTime(),
                decision.scheduledAt.getTime(),
              ),
            ),
          );
        throw new BadRequestException(
          'The scheduled time or quiet hours prevent sending now.',
        );
      }
      const interval = Math.max(
        category!.minIntervalHours,
        job.eventType === 're_engagement' ? 168 : 0,
      );
      const previous = await manager
        .getRepository(NotificationJob)
        .createQueryBuilder('other')
        .where(
          'other.userId = :userId AND other.categoryKey = :category AND other.channel = :channel AND other.id != :id',
          { userId: user.id, category: job.categoryKey, channel: 'email', id },
        )
        .andWhere('(other.sentAt > :cutoff OR other.status IN (:...pending))', {
          cutoff: new Date(Date.now() - interval * 3600000),
          pending: ['processing', 'delivery_uncertain'],
        })
        .getCount();
      if (previous) {
        if (automatic)
          return defer(
            'scheduled',
            'frequency_limit',
            new Date(Date.now() + interval * 3600000),
          );
        throw new BadRequestException(
          'A recent or unconfirmed email in this category prevents another send. Check activity and the category frequency limit.',
        );
      }
      const template = automatic
        ? reengagementEmail(user.displayName || user.firstName, appUrl ?? null)
        : null;
      job.status = 'processing';
      job.reason = null;
      job.attempts++;
      await manager.save(job);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.NOTIFICATION_SEND_REQUESTED,
        actorUserId: principal?.userId,
        actorType: automatic ? 'system' : 'admin',
        entityType: 'notification',
        entityId: id,
        metadata: { channel: 'email', attempt: job.attempts, automatic },
      });
      return {
        to: user.email,
        subject: template?.subject ?? input!.subject,
        text: template?.text ?? input!.message,
        html:
          template?.html ??
          formattedNotificationEmail(input!.subject, input!.message),
      };
    });
    if (!recipient)
      return { status: 'skipped', message: 'Reminder eligibility rechecked.' };
    let outcome: 'sent' | 'failed' | 'delivery_uncertain' = 'sent';
    let retryable = false;
    try {
      await this.sender.send(
        recipient.to,
        recipient.subject,
        recipient.text,
        recipient.html,
      );
    } catch (error) {
      retryable =
        error instanceof EmailDeliveryError &&
        !error.uncertain &&
        error.retryable;
      outcome =
        error instanceof EmailDeliveryError && !error.uncertain
          ? 'failed'
          : 'delivery_uncertain';
    }
    await this.db.transaction(async (manager) => {
      const job = await manager.findOne(NotificationJob, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!job || job.status !== 'processing')
        throw new BadRequestException(
          'Delivery state needs investigation before retrying.',
        );
      const retry =
        automatic && outcome === 'failed' && retryable && job.attempts < 5;
      job.status = retry ? 'retry_pending' : outcome;
      job.reason = retry
        ? 'temporary_delivery_failure'
        : outcome === 'sent'
          ? null
          : 'unknown_error';
      if (retry)
        job.scheduledAt = new Date(
          Date.now() + Math.min(360, 5 * 2 ** (job.attempts - 1)) * 60000,
        );
      job.sentAt = outcome === 'sent' ? new Date() : null;
      await manager.save(job);
      await this.audit.recordTransactional(manager, {
        action: AuditAction.NOTIFICATION_SEND_COMPLETED,
        actorUserId: principal?.userId,
        actorType: automatic ? 'system' : 'admin',
        entityType: 'notification',
        entityId: id,
        metadata: {
          channel: 'email',
          status: job.status,
          automatic,
          attempt: job.attempts,
        },
      });
    });
    return {
      status: outcome,
      message:
        outcome === 'sent'
          ? 'SMTP accepted the email. Inbox delivery is not yet confirmed.'
          : outcome === 'failed'
            ? 'Email was rejected. Check SMTP settings and the recipient.'
            : 'The delivery outcome is unconfirmed. Check your SMTP provider before sending again.',
    };
  }
}
