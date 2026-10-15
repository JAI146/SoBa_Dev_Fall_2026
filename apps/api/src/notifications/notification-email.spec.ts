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
      status: UserStatus.ACTIVE,
      userType: UserType.CUSTOMER,
      emailVerifiedAt: new Date(),
      notificationPreferences: { goalReminders: true },
      timeZone: 'UTC',
    };
    const job = {
      id: '00000000-0000-4000-8000-000000000003',
      userId: user.id,
      categoryKey: 'goals',
      eventType: 'staff_notification',
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
  it('records SMTP acceptance without claiming inbox delivery; prevents a second send', async () => {
    const f = fixture();
    expect((await f.service.send(principal, f.job.id, input)).status).toBe(
      'sent',
    );
    expect(f.job.sentAt).toBeInstanceOf(Date);
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
