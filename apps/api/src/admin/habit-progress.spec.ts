import {
  calculateHabitProgress,
  type HabitLifecycleEvent,
} from './habit-progress';

const base = {
  frequency: 'daily' as const,
  isActive: true,
  timeZone: 'America/Chicago',
  createdAt: new Date('2026-09-01T12:00:00Z'),
  now: new Date('2026-10-05T13:00:00Z'),
  completionDates: [] as string[],
  events: [] as HabitLifecycleEvent[],
};
const event = (
  action: string,
  day: string,
  metadata: Record<string, unknown> = {},
): HabitLifecycleEvent => ({
  action,
  createdAt: new Date(`${day}T12:00:00Z`),
  metadata,
});

describe('habit progress calendar rules', () => {
  it('does not mark the current unfinished day missed', () => {
    const result = calculateHabitProgress({
      ...base,
      createdAt: new Date('2026-10-05T12:00:00Z'),
    });
    expect(result.status).toBe('active');
    expect(result.missedPeriods).toBe(0);
    expect(result.consistencyPercent).toBeNull();
  });
  it('counts closed daily periods and tolerates duplicate and future dates', () => {
    const result = calculateHabitProgress({
      ...base,
      completionDates: ['2026-10-03', '2026-10-04', '2026-10-04', '2026-10-06'],
    });
    expect(result.completionCount).toBe(2);
    expect(result.eligiblePeriods).toBe(29);
    expect(result.missedPeriods).toBe(27);
    expect(result.streak).toBe(2);
    expect(result.status).toBe('active');
  });
  it('shows recovery after completing the period following a miss', () => {
    expect(
      calculateHabitProgress({ ...base, completionDates: ['2026-10-05'] })
        .status,
    ).toBe('recovering');
    expect(
      calculateHabitProgress({
        ...base,
        completionDates: ['2026-10-04', '2026-10-05'],
      }).status,
    ).toBe('completed');
    expect(calculateHabitProgress(base).status).toBe('missed');
  });
  it('uses one completion per Monday–Sunday week and preserves a live streak', () => {
    const result = calculateHabitProgress({
      ...base,
      frequency: 'weekly',
      completionDates: ['2026-09-20', '2026-09-21', '2026-09-25', '2026-10-04'],
    });
    expect(result.streak).toBe(3);
    expect(result.completedPeriods).toBe(3);
    expect(result.eligiblePeriods).toBe(4);
    expect(result.missedPeriods).toBe(1);
    expect(result.status).toBe('active');
  });
  it('excludes full paused periods, freezes a streak, and counts resumed dates', () => {
    const result = calculateHabitProgress({
      ...base,
      createdAt: new Date('2026-10-01T12:00:00Z'),
      completionDates: ['2026-10-01', '2026-10-02', '2026-10-05'],
      events: [
        event('habit.paused', '2026-10-03'),
        event('habit.resumed', '2026-10-05'),
      ],
    });
    expect(result.missedPeriods).toBe(0);
    expect(result.eligiblePeriods).toBe(2);
    expect(result.consistencyPercent).toBe(100);
    expect(result.streak).toBe(3);
    expect(result.status).toBe('completed');
  });
  it('distinguishes an explicit pause from an inactive selection', () => {
    expect(
      calculateHabitProgress({
        ...base,
        events: [event('habit.paused', '2026-10-04')],
      }).status,
    ).toBe('paused');
    const inactive = calculateHabitProgress({ ...base, isActive: false });
    expect(inactive.status).toBe('inactive');
    expect(inactive.consistencyPercent).toBeNull();
    expect(inactive.missedPeriods).toBeNull();
  });
  it('does not penalize as-needed habits', () => {
    const result = calculateHabitProgress({
      ...base,
      frequency: 'as_needed',
      completionDates: ['2026-10-01'],
    });
    expect(result.status).toBe('active');
    expect(result.streak).toBeNull();
    expect(result.missedPeriods).toBeNull();
    expect(result.consistencyPercent).toBeNull();
  });
  it('resolves the customer date before evaluating completion or lateness', () => {
    const result = calculateHabitProgress({
      ...base,
      now: new Date('2026-10-05T02:00:00Z'),
      completionDates: ['2026-10-03', '2026-10-04'],
    });
    expect(result.windowEnd).toBe('2026-10-04');
    expect(result.status).toBe('completed');
  });
  it('counts calendar days across daylight saving boundaries', () => {
    const result = calculateHabitProgress({
      ...base,
      createdAt: new Date('2026-03-07T12:00:00Z'),
      now: new Date('2026-03-09T12:00:00Z'),
      completionDates: ['2026-03-07', '2026-03-08'],
    });
    expect(result.eligiblePeriods).toBe(2);
    expect(result.consistencyPercent).toBe(100);
    expect(result.streak).toBe(2);
  });
  it('resets a streak on deselection and tracks pauses without inventing them', () => {
    const result = calculateHabitProgress({
      ...base,
      createdAt: new Date('2026-10-01T12:00:00Z'),
      completionDates: ['2026-10-01', '2026-10-05'],
      events: [
        event('habit.selection_changed', '2026-10-01', {
          previousActive: null,
          active: true,
        }),
        event('habit.selection_changed', '2026-10-02', {
          previousActive: true,
          active: false,
        }),
        event('habit.selection_changed', '2026-10-05', {
          previousActive: false,
          active: true,
        }),
      ],
    });
    expect(result.historyLimited).toBe(false);
    expect(result.streak).toBe(1);
    expect(result.missedPeriods).toBe(0);
  });
});
