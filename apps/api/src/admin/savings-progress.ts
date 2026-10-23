import type {
  GoalSavingsProgress,
  SavingsConsistency,
} from '@purposemint/contracts';
import { todayInTimeZone } from '../common/mappers/onboarding.mapper';

function shift(day: string, n: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000)
    .toISOString()
    .slice(0, 10);
}
function periodStart(day: string, frequency: 'weekly' | 'monthly') {
  if (frequency === 'monthly') return `${day.slice(0, 7)}-01`;
  return shift(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
}
function next(start: string, frequency: 'weekly' | 'monthly', n = 1) {
  if (frequency === 'weekly') return shift(start, n * 7);
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + n);
  return date.toISOString().slice(0, 10);
}
export function consistencyRating(
  percent: number | null,
): SavingsConsistency['rating'] {
  return percent === null
    ? 'unavailable'
    : percent >= 80
      ? 'green'
      : percent >= 50
        ? 'yellow'
        : 'red';
}
export function consistencyPercent(completed: number, eligible: number) {
  return eligible ? Math.round((completed / eligible) * 100) : null;
}
/** Observed contributions, not a promised saving schedule. Only whole elapsed
 * periods after goal creation enter the score. Dates use the customer's timezone. */
export function calculateSavingsProgress(input: {
  goalId: string;
  createdAt: Date;
  savedAmount: number;
  timeZone: string | null;
  entries: { amount: number; createdAt: Date }[];
  now?: Date;
}): GoalSavingsProgress {
  const now = input.now ?? new Date();
  const today = todayInTimeZone(input.timeZone, now);
  const created = todayInTimeZone(input.timeZone, input.createdAt);
  const entries = input.entries
    .filter(
      (e) =>
        e.createdAt >= input.createdAt &&
        e.createdAt <= now &&
        Number.isFinite(Number(e.amount)) &&
        Number(e.amount) > 0,
    )
    .map((e) => ({
      day: todayInTimeZone(input.timeZone, e.createdAt),
      cents: Math.round(Number(e.amount) * 100),
    }));
  const build = (frequency: 'weekly' | 'monthly'): SavingsConsistency => {
    const current = periodStart(today, frequency);
    const count = frequency === 'weekly' ? 12 : 6;
    const first = [
      next(current, frequency, -(count - 1)),
      periodStart(created, frequency),
    ]
      .sort()
      .at(-1)!;
    const periods: SavingsConsistency['periods'] = [];
    for (let start = first; start <= current; start = next(start, frequency)) {
      const end = shift(next(start, frequency), -1);
      const eligible = start >= created && end < today;
      const deposits = entries.filter((e) => e.day >= start && e.day <= end);
      periods.push({
        start,
        end,
        eligible,
        amount: deposits.reduce((sum, e) => sum + e.cents, 0) / 100,
        cumulativeRecorded:
          entries
            .filter((e) => e.day <= end)
            .reduce((sum, e) => sum + e.cents, 0) / 100,
        contributionCount: deposits.length,
        status:
          end >= today
            ? 'in_progress'
            : start < created
              ? 'partial'
              : deposits.length
                ? 'contributed'
                : 'missed',
      });
    }
    const eligiblePeriods = periods.filter((p) => p.eligible).length;
    const contributedPeriods = periods.filter(
      (p) => p.eligible && p.contributionCount > 0,
    ).length;
    const percent = consistencyPercent(contributedPeriods, eligiblePeriods);
    return {
      periods,
      eligiblePeriods,
      contributedPeriods,
      missedPeriods: eligiblePeriods - contributedPeriods,
      percent,
      rating: consistencyRating(percent),
    };
  };
  return {
    goalId: input.goalId,
    recordedAmount: entries.reduce((sum, e) => sum + e.cents, 0) / 100,
    recordedCount: entries.length,
    displayedSavedAmount: Number(input.savedAmount),
    weekly: build('weekly'),
    monthly: build('monthly'),
  };
}
