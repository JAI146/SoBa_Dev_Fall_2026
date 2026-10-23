import 'reflect-metadata';
import {
  AdminPermission,
  UserType,
  queueNotificationSchema,
} from '@purposemint/contracts';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { NotificationOperationsController } from './notifications.controller';
import {
  allowedAt,
  DEFAULT_CATEGORIES,
  settingsFor,
} from './notification-policy';
describe('14.2 notification operations', () => {
  it('protects reads and mutations separately', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, NotificationOperationsController),
    ).toEqual([UserType.ADMIN]);
    for (const method of ['overview', 'preferences'] as const)
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          Object.getOwnPropertyDescriptor(
            NotificationOperationsController.prototype,
            method,
          )?.value as object,
        ),
      ).toEqual([AdminPermission.NOTIFICATIONS_VIEW]);
    for (const method of ['configure', 'queue', 'retry', 'scan'] as const)
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          Object.getOwnPropertyDescriptor(
            NotificationOperationsController.prototype,
            method,
          )?.value as object,
        ),
      ).toEqual([AdminPermission.NOTIFICATIONS_EDIT]);
  });
  it('rejects forged delivery results and arbitrary message content', () => {
    const request = {
      userId: '00000000-0000-4000-8000-000000000001',
      requestId: '00000000-0000-4000-8000-000000000002',
      categoryKey: 'goals',
      eventType: 'goal.reminder',
      channel: 'push',
    };
    expect(queueNotificationSchema.safeParse(request).success).toBe(true);
    for (const extra of [
      { status: 'delivered' },
      { mandatory: true },
      { body: 'private text' },
    ])
      expect(
        queueNotificationSchema.safeParse({ ...request, ...extra }).success,
      ).toBe(false);
  });
  it('preserves 14.1 preferences with quiet hours in the profile timezone', () => {
    const settings = settingsFor(
      {
        categorySettings: {
          categories: { goals: { push: true, email: false } },
        },
      },
      DEFAULT_CATEGORIES,
      'America/Chicago',
    );
    expect(settings.categories.goals).toEqual({ push: true, email: false });
    expect(settings.quietHours.timeZone).toBe('America/Chicago');
  });
  it('defers overnight quiet hours across daylight saving time', () => {
    const settings = settingsFor({ goalReminders: true });
    settings.quietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timeZone: 'America/Chicago',
    };
    const decision = allowedAt(
      DEFAULT_CATEGORIES.find((c) => c.key === 'goals')!,
      'push',
      settings,
      new Date('2026-11-01T05:30:00Z'),
    );
    expect(decision.allowed).toBe(true);
    expect(decision.scheduledAt.toISOString()).toBe('2026-11-01T14:00:00.000Z');
  });
  it('mandatory communications bypass optional opt-outs', () => {
    const settings = settingsFor({});
    settings.optionalOptOut = true;
    const now = new Date('2026-10-12T23:00:00Z');
    expect(
      allowedAt(
        DEFAULT_CATEGORIES.find((c) => c.key === 'transactions')!,
        'email',
        settings,
        now,
      ),
    ).toEqual({ allowed: true, scheduledAt: now, reason: null });
  });
});
