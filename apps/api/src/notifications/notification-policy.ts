import {
  notificationSettingsSchema,
  REQUIRED_NOTIFICATION_KEYS,
  type NotificationCategoryPublic,
  type NotificationSettings,
} from '@purposemint/contracts';
export const DEFAULT_CATEGORIES: NotificationCategoryPublic[] = [
  ['goals', 'Goals'],
  ['habits', 'Habits'],
  ['weekly_savings', 'Weekly Savings'],
  ['savings_recommendations', 'Savings Recommendations'],
  ['progress_milestones', 'Progress & Milestones'],
  ['pathway_recommendations', 'Pathway Recommendations'],
  ['kiromoney', 'Coaching / KiroMoney'],
  ['product_communications', 'Other Optional Communications'],
  ['security', 'Security'],
  ['critical_updates', 'Critical App Updates'],
  ['transactions', 'Transactions'],
].map(([key, name]) => ({
  key,
  name,
  mandatory: (REQUIRED_NOTIFICATION_KEYS as readonly string[]).includes(key),
  pushSupported: true,
  emailSupported: true,
  enabled: true,
  minIntervalHours: 24,
}));
export function settingsFor(
  raw: unknown,
  categories: NotificationCategoryPublic[] = DEFAULT_CATEGORIES,
  timeZone: string | null = null,
): NotificationSettings {
  const storage = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  let zone = timeZone ?? 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    zone = 'UTC';
  }
  const saved =
    storage.categorySettings && typeof storage.categorySettings === 'object'
      ? (storage.categorySettings as Record<string, unknown>)
      : null;
  const parsed = notificationSettingsSchema.safeParse(
    saved
      ? {
          ...saved,
          quietHours: saved.quietHours ?? {
            enabled: false,
            start: '22:00',
            end: '08:00',
            timeZone: zone,
          },
        }
      : saved,
  );
  const legacy: Record<string, unknown> = {
    goals: storage.goalReminders,
    weekly_savings: storage.weeklyCheckIn,
    product_communications: storage.productUpdates,
  };
  const stored = parsed.success
    ? parsed.data
    : {
        categories: {},
        optionalOptOut: false,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timeZone: zone,
        },
      };
  return {
    ...stored,
    categories: Object.fromEntries(
      categories.map((category) => {
        const old = stored.categories[category.key] ?? {
          push: legacy[category.key] === true,
          email: legacy[category.key] === true,
        };
        return [
          category.key,
          {
            push: category.mandatory || (category.pushSupported && old.push),
            email: category.mandatory || (category.emailSupported && old.email),
          },
        ];
      }),
    ),
  };
}
const formatters = new Map<string, Intl.DateTimeFormat>();
function localMinute(date: Date, zone: string): number {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(zone, formatter);
  }
  const parts = formatter.formatToParts(date);
  return (
    Number(parts.find((p) => p.type === 'hour')?.value) * 60 +
    Number(parts.find((p) => p.type === 'minute')?.value)
  );
}
export function isQuiet(
  date: Date,
  quiet: NotificationSettings['quietHours'],
): boolean {
  if (!quiet.enabled) return false;
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const current = localMinute(date, quiet.timeZone),
    start = minutes(quiet.start),
    end = minutes(quiet.end);
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}
export function allowedAt(
  category: NotificationCategoryPublic,
  channel: 'push' | 'email',
  settings: NotificationSettings,
  now: Date,
): { allowed: boolean; scheduledAt: Date; reason: string | null } {
  if (category.mandatory)
    return { allowed: true, scheduledAt: now, reason: null };
  if (!category.enabled || !category[`${channel}Supported`])
    return { allowed: false, scheduledAt: now, reason: 'category_unavailable' };
  if (settings.optionalOptOut || !settings.categories[category.key]?.[channel])
    return { allowed: false, scheduledAt: now, reason: 'optional_opt_out' };
  for (let minute = 0; minute <= 1500; minute++) {
    const date = new Date(now.getTime() + minute * 60000);
    if (!isQuiet(date, settings.quietHours))
      return {
        allowed: true,
        scheduledAt: date,
        reason: minute ? 'quiet_hours' : null,
      };
  }
  return { allowed: false, scheduledAt: now, reason: 'quiet_hours' };
}
