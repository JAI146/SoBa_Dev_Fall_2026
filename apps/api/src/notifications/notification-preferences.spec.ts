import 'reflect-metadata';
import {
  UserType,
  notificationSettingsSchema,
  updateNotificationPreferencesSchema,
} from '@purposemint/contracts';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { NotificationPreferencesController } from './notifications.controller';
import { DEFAULT_CATEGORIES, settingsFor } from './notification-policy';
describe('14.1 notification preferences', () => {
  it('provides eight optional categories and three mandatory categories', () => {
    expect(DEFAULT_CATEGORIES.filter((c) => !c.mandatory)).toHaveLength(8);
    expect(DEFAULT_CATEGORIES.filter((c) => c.mandatory)).toHaveLength(3);
  });
  it('always enables both required channels, even for tampered storage', () => {
    const stored = settingsFor({});
    for (const key of ['security', 'critical_updates', 'transactions'])
      stored.categories[key] = { push: false, email: false };
    const normalized = settingsFor({
      categorySettings: stored,
      securityAlerts: false,
    });
    for (const key of ['security', 'critical_updates', 'transactions'])
      expect(normalized.categories[key]).toEqual({ push: true, email: true });
  });
  it('preserves independent optional push and email choices', () => {
    const stored = settingsFor({});
    stored.categories.goals = { push: false, email: true };
    expect(settingsFor({ categorySettings: stored }).categories.goals).toEqual({
      push: false,
      email: true,
    });
  });
  it('maps explicit legacy choices and keeps new optional categories off', () => {
    const stored = settingsFor({ goalReminders: true, weeklyCheckIn: false });
    expect(stored.categories.goals.push).toBe(true);
    expect(stored.categories.weekly_savings.email).toBe(false);
    expect(stored.categories.habits.push).toBe(false);
  });
  it('prevents disabling security through the old endpoint', () => {
    expect(
      updateNotificationPreferencesSchema.safeParse({ securityAlerts: false })
        .success,
    ).toBe(false);
  });
  it('rejects another user ID in a preferences payload', () => {
    expect(
      notificationSettingsSchema.safeParse({
        ...settingsFor({}),
        userId: '00000000-0000-4000-8000-000000000001',
      }).success,
    ).toBe(false);
  });
  it('limits the preference endpoints to customer accounts', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, NotificationPreferencesController),
    ).toEqual([UserType.CUSTOMER]);
  });
});
