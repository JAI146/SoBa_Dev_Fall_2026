import type { HabitProgress } from '@purposemint/contracts';
import { todayInTimeZone } from '../common/mappers/onboarding.mapper';

export type HabitLifecycleEvent = {
  action: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
};

const DAY = 86_400_000;
function shift(day: string, offset: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * DAY)
    .toISOString()
    .slice(0, 10);
}
function monday(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return shift(day, -((weekday + 6) % 7));
}

/** Calendar-day arithmetic happens on ISO dates, after resolving the user's timezone.
 * Closed periods only enter the consistency denominator; the current period isn't late.
 * Audit dates have whole-day effect: pause excludes that date, resume includes it.
 */
export function calculateHabitProgress(input: {
  frequency: 'daily' | 'weekly' | 'as_needed';
  isActive: boolean;
  createdAt: Date;
  timeZone: string | null;
  completionDates: string[];
  events: HabitLifecycleEvent[];
  now?: Date;
}): HabitProgress {
  const now = input.now ?? new Date();
  const today = todayInTimeZone(input.timeZone, now);
  const created = todayInTimeZone(input.timeZone, input.createdAt);
  const windowStart = [created, shift(today, -29)].sort().at(-1)!;
  const dates = [...new Set(input.completionDates)]
    .filter((day) => day >= created && day <= today)
    .sort();
  const completed = new Set(dates);
  const events = input.events
    .filter((event) => event.createdAt <= now)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const first = events[0];
  const historyLimited = !(
    first?.action === 'habit.selection_changed' &&
    first.metadata?.previousActive === null
  );
  const unknownInactiveHistory =
    historyLimited && !input.isActive && !events.length;
  let selected =
    typeof first?.metadata?.previousActive === 'boolean'
      ? first.metadata.previousActive
      : first?.action === 'habit.selection_changed' &&
          first.metadata?.previousActive === null
        ? false
        : input.isActive;
  let paused = false;
  let eventIndex = 0;
  const periods = new Map<
    string,
    { end: string; eligible: boolean; completed: boolean; selected: boolean }
  >();
  const inWindow = new Map<
    string,
    { end: string; eligible: boolean; completed: boolean }
  >();
  for (let day = created; day <= today; day = shift(day, 1)) {
    while (
      events[eventIndex] &&
      todayInTimeZone(input.timeZone, events[eventIndex].createdAt) <= day
    ) {
      const event = events[eventIndex++];
      if (event.action === 'habit.selection_changed') {
        selected = event.metadata?.active === true;
        paused = false;
      } else if (event.action === 'habit.paused') paused = true;
      else if (event.action === 'habit.resumed') paused = false;
    }
    const key = input.frequency === 'weekly' ? monday(day) : day;
    const end = input.frequency === 'weekly' ? shift(key, 6) : day;
    const period = periods.get(key) ?? {
      end,
      eligible: false,
      completed: false,
      selected: false,
    };
    period.selected ||= selected;
    period.eligible ||= selected && !paused;
    period.completed ||= selected && !paused && completed.has(day);
    periods.set(key, period);
    if (day >= windowStart) {
      const recent = inWindow.get(key) ?? {
        end,
        eligible: false,
        completed: false,
      };
      recent.eligible ||= selected && !paused;
      recent.completed ||= selected && !paused && completed.has(day);
      inWindow.set(key, recent);
    }
  }
  const currentKey = input.frequency === 'weekly' ? monday(today) : today;
  const currentCompleted = periods.get(currentKey)?.completed ?? false;
  const closed = [...periods.entries()].filter(
    ([, period]) => period.end < today,
  );
  const lastEligible = closed
    .filter(([, period]) => period.eligible)
    .at(-1)?.[1];
  const previousMissed = Boolean(lastEligible && !lastEligible.completed);
  const scheduled = input.frequency !== 'as_needed';
  let streak: number | null = scheduled ? 0 : null;
  if (scheduled) {
    const candidates = [...periods.entries()].reverse();
    for (const [key, period] of candidates) {
      if (key === currentKey && !period.completed) continue;
      if (!period.eligible) {
        if (!period.selected) break; // Deselection ends a streak; an explicit pause freezes it.
        continue;
      }
      if (!period.completed) break;
      streak! += 1;
    }
  }
  // A weekly denominator includes only full weeks within the window.
  const recentClosed = [...inWindow.entries()]
    .filter(
      ([key, period]) =>
        key >= windowStart && period.end < today && period.eligible,
    )
    .map(([, period]) => period);
  const eligiblePeriods =
    scheduled && !unknownInactiveHistory ? recentClosed.length : null;
  const completedPeriods = scheduled
    ? recentClosed.filter((period) => period.completed).length
    : dates.filter((day) => day >= windowStart).length;
  const status: HabitProgress['status'] = !input.isActive
    ? 'inactive'
    : paused
      ? 'paused'
      : currentCompleted
        ? scheduled && previousMissed
          ? 'recovering'
          : 'completed'
        : scheduled && previousMissed
          ? 'missed'
          : 'active';
  return {
    status,
    completedInCurrentPeriod: currentCompleted,
    completionCount: dates.length,
    lastCompletedOn: dates.at(-1) ?? null,
    missedPeriods:
      eligiblePeriods === null ? null : eligiblePeriods - completedPeriods,
    completedPeriods,
    eligiblePeriods,
    consistencyPercent: eligiblePeriods
      ? Math.round((completedPeriods / eligiblePeriods) * 100)
      : null,
    streak: unknownInactiveHistory ? null : streak,
    streakUnit: scheduled
      ? input.frequency === 'daily'
        ? 'days'
        : 'weeks'
      : null,
    windowStart,
    windowEnd: today,
    historyLimited,
  };
}
