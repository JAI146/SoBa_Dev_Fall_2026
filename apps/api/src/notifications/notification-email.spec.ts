import { DataSource } from 'typeorm';
import { NotificationEmailService } from './notification-email.service';
import {
  NotificationEmailSender,
  EmailDeliveryError,
} from './notification-email.sender';
import { AuditService } from '../audit/audit.service';
import { User } from '../entities/user.entity';
import { DEFAULT_CATEGORIES } from './notification-policy';
import {
  UserStatus,
  UserType,
  notificationJobSchema,
  notificationEmailInputSchema,
  notificationSmtpResponseSchema,
  queueNotificationSchema,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';
import { reengagementKey } from './re-engagement-policy';

describe('manual notification email', () => {
  const principal = {
    userId: '00000000-0000-4000-8000-000000000001',
  } as AuthPrincipal;
  const input = {
    recipientEmail: 'customer@purposemint.org',
    subject: 'Your goal',
    message: 'Keep going.',
  };
  function fixture() {
    const user = {
      id: '00000000-0000-4000-8000-000000000002',
      email: input.recipientEmail,
      displayName: 'Jordan',
      firstName: 'Jordan',
      createdAt: new Date(Date.now() - 10 * 86400000),
      lastLoginAt: new Date(Date.now() - 4 * 86400000),
      status: UserStatus.ACTIVE,
      userType: UserType.CUSTOMER,
      emailVerifiedAt: new Date(),
      notificationPreferences: { goalReminders: true, productUpdates: true },
      timeZone: 'UTC',
    };
    const job = {
      id: '00000000-0000-4000-8000-000000000003',
      userId: user.id,
      categoryKey: 'goals',
      eventType: 'staff_notification',
      idempotencyKey: 'staff-test',
      channel: 'email',
      mandatory: false,
      status: 'scheduled',
      attempts: 0,
      retryRequests: 0,
      scheduledAt: new Date(Date.now() - 60000),
      sentAt: null as Date | null,
      deliveredAt: null,
      createdAt: new Date(),
      reason: null,
    };
    const count = jest.fn().mockResolvedValue(0);
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: count,
    };
    const manager = {
      findOneBy: jest.fn().mockResolvedValue(job),
      findOne: jest
        .fn()
        .mockImplementation((entity: unknown) =>
          Promise.resolve(entity === User ? user : job),
        ),
      find: jest.fn().mockResolvedValue(DEFAULT_CATEGORIES),
      save: jest.fn().mockResolvedValue(undefined),
      getRepository: () => ({ createQueryBuilder: () => qb }),
    };
    const db = {
      transaction: (fn: (m: typeof manager) => Promise<unknown>) => fn(manager),
    };
    const sender = {
      ready: jest.fn().mockResolvedValue(true),
      send: jest.fn().mockResolvedValue(undefined),
    };
    const audit = {
      recordTransactional: jest.fn().mockResolvedValue(undefined),
    };
    const service = new NotificationEmailService(
      db as unknown as DataSource,
      sender as unknown as NotificationEmailSender,
      audit as unknown as AuditService,
    );
    return { service, job, user, sender, audit, count };
  }
  function automated() {
    const f = fixture();
    f.job.eventType = 're_engagement';
    f.job.categoryKey = 'product_communications';
    f.job.idempotencyKey = reengagementKey(f.user, 'email');
    return f;
  }
  it('automatically supplies personalized content and records a system actor', async () => {
    const f = automated();
    await f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/');
    expect(f.sender.send).toHaveBeenCalledWith(
      f.user.email,
      'Your next small step with PurposeMint',
      expect.stringContaining('Hi Jordan,'),
      expect.stringContaining('Open PurposeMint'),
    );
    expect(f.job.status).toBe('sent');
    expect(f.audit.recordTransactional).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actorType: 'system', actorUserId: undefined }),
    );
  });
  it('never automatically dispatches a staff, goal, or habit notification', async () => {
    const f = fixture();
    await expect(
      f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/'),
    ).rejects.toThrow('Only inactivity');
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('cancels a reminder when its customer has logged in again', async () => {
    const f = automated();
    f.user.lastLoginAt = new Date();
    await f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/');
    expect(f.job.status).toBe('cancelled');
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('suppresses opted-out customers and demo addresses without sending', async () => {
    const f = automated();
    f.user.notificationPreferences.productUpdates = false;
    await f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/');
    expect(f.job.status).toBe('suppressed');
    const demo = automated();
    demo.user.email = 'demo@purposemint.local';
    await demo.service.sendAutomated(
      demo.job.id,
      'https://app.purposemint.org/',
    );
    expect(demo.job.status).toBe('suppressed');
    expect(demo.sender.send).not.toHaveBeenCalled();
  });
  it('defers future reminders without consuming an attempt', async () => {
    const f = automated();
    f.job.scheduledAt = new Date(Date.now() + 86400000);
    await f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/');
    expect(f.job.status).toBe('scheduled');
    expect(f.job.attempts).toBe(0);
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('backs off after a known temporary rejection', async () => {
    const f = automated();
    f.sender.send.mockRejectedValue(new EmailDeliveryError(false, true));
    await f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/');
    expect(f.job.status).toBe('retry_pending');
    expect(f.job.scheduledAt.getTime()).toBeGreaterThan(Date.now() + 4 * 60000);
  });
  it('postpones automatic email during quiet hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T23:00:00Z'));
    try {
      const f = automated();
      Object.assign(f.user, {
        notificationPreferences: {
          categorySettings: {
            categories: {
              product_communications: { push: false, email: true },
            },
            optionalOptOut: false,
            quietHours: {
              enabled: true,
              start: '22:00',
              end: '08:00',
              timeZone: 'UTC',
            },
          },
        },
      });
      await f.service.sendAutomated(f.job.id, null);
      expect(f.job.status).toBe('scheduled');
      expect(f.job.scheduledAt.toISOString()).toBe('2026-10-18T08:00:00.000Z');
      expect(f.job.attempts).toBe(0);
      expect(f.sender.send).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
  it('honors existing category frequency when automatically claiming', async () => {
    const f = automated();
    f.count.mockResolvedValue(1);
    await f.service.sendAutomated(f.job.id, null);
    expect(f.job.status).toBe('scheduled');
    expect(f.job.reason).toBe('frequency_limit');
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('never automatically retries an uncertain outcome', async () => {
    const f = automated();
    f.sender.send.mockRejectedValue(new EmailDeliveryError(true));
    await f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/');
    expect(f.job.status).toBe('delivery_uncertain');
    await expect(
      f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/'),
    ).rejects.toThrow('cannot be sent again');
    expect(f.sender.send).toHaveBeenCalledTimes(1);
  });
  it('does not retry a permanent rejection or exceed the attempt limit', async () => {
    const f = automated();
    f.sender.send.mockRejectedValue(new EmailDeliveryError(false, false));
    await f.service.sendAutomated(f.job.id, 'https://app.purposemint.org/');
    expect(f.job.status).toBe('failed');
    const limited = automated();
    limited.job.attempts = 5;
    await expect(
      limited.service.sendAutomated(
        limited.job.id,
        'https://app.purposemint.org/',
      ),
    ).rejects.toThrow('limit');
    expect(limited.sender.send).not.toHaveBeenCalled();
  });
  it('records SMTP acceptance without claiming inbox delivery; prevents a second send', async () => {
    const f = fixture();
    expect((await f.service.send(principal, f.job.id, input)).status).toBe(
      'sent',
    );
    expect(f.job.sentAt).toBeInstanceOf(Date);
    expect(f.sender.send).toHaveBeenCalledWith(
      input.recipientEmail,
      input.subject,
      input.message,
      expect.stringContaining('<h1'),
    );
    expect(f.job.deliveredAt).toBeNull();
    await expect(f.service.send(principal, f.job.id, input)).rejects.toThrow(
      'cannot be sent again',
    );
    expect(f.sender.send).toHaveBeenCalledTimes(1);
    expect(
      JSON.stringify(f.audit.recordTransactional.mock.calls),
    ).not.toContain(input.message);
  });
  it.each([
    'sent',
    'delivered',
    'cancelled',
    'processing',
    'delivery_uncertain',
  ])('rejects %s jobs', async (status) => {
    const f = fixture();
    f.job.status = status;
    await expect(f.service.send(principal, f.job.id, input)).rejects.toThrow();
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('checks category frequency under the customer lock', async () => {
    const f = fixture();
    f.count.mockResolvedValue(1);
    await expect(f.service.send(principal, f.job.id, input)).rejects.toThrow(
      'recent or unconfirmed',
    );
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('rejects a changed recipient', async () => {
    const f = fixture();
    f.user.email = 'changed@purposemint.org';
    await expect(f.service.send(principal, f.job.id, input)).rejects.toThrow(
      'address changed',
    );
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('respects opt out', async () => {
    const f = fixture();
    f.user.notificationPreferences.goalReminders = false;
    await expect(f.service.send(principal, f.job.id, input)).rejects.toThrow(
      'preferences',
    );
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it('respects future planned times', async () => {
    const f = fixture();
    f.job.scheduledAt = new Date(Date.now() + 86400000);
    await expect(f.service.send(principal, f.job.id, input)).rejects.toThrow(
      'scheduled time',
    );
  });
  it('does not send when audit intent cannot be saved', async () => {
    const f = fixture();
    f.audit.recordTransactional.mockRejectedValue(
      new Error('audit unavailable'),
    );
    await expect(f.service.send(principal, f.job.id, input)).rejects.toThrow(
      'audit unavailable',
    );
    expect(f.sender.send).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    'distinguishes uncertain=%s from confirmed rejection',
    async (uncertain) => {
      const f = fixture();
      f.sender.send.mockRejectedValue(new EmailDeliveryError(uncertain));
      expect((await f.service.send(principal, f.job.id, input)).status).toBe(
        uncertain ? 'delivery_uncertain' : 'failed',
      );
      expect(f.job.sentAt).toBeNull();
    },
  );
  it('allows planner events in responses but not staff queue requests', () => {
    const f = fixture();
    expect(
      notificationJobSchema.safeParse({
        ...f.job,
        eventType: 're_engagement',
        scheduledAt: f.job.scheduledAt.toISOString(),
        createdAt: f.job.createdAt.toISOString(),
      }).success,
    ).toBe(true);
    expect(
      queueNotificationSchema.safeParse({
        userId: f.user.id,
        categoryKey: 'goals',
        channel: 'email',
        eventType: 're_engagement',
        requestId: f.job.id,
      }).success,
    ).toBe(false);
  });
  it('rejects email header injection and secrets in masked response', () => {
    expect(
      notificationEmailInputSchema.safeParse({
        ...input,
        subject: 'Hello\r\nBcc: bad@purposemint.org',
      }).success,
    ).toBe(false);
    expect(
      notificationSmtpResponseSchema.safeParse({
        configured: true,
        settings: {
          smtpServer: 'smtp.test',
          smtpPort: 587,
          smtpEmailUser: 'apikey',
          fromEmail: 'sender@purposemint.org',
          smtpEnabled: true,
          hasPassword: true,
          smtpEmailPassword: 'secret',
        },
      }).success,
    ).toBe(false);
  });
});
