import {
  calculateSavingsProgress,
  consistencyRating,
} from './savings-progress';
const goal = {
  goalId: '00000000-0000-4000-8000-000000000002',
  createdAt: new Date('2026-07-01T05:00:00Z'),
  savedAmount: 600,
  timeZone: 'America/Chicago',
  now: new Date('2026-10-05T14:00:00Z'),
};
describe('observed savings consistency', () => {
  it('counts contribution periods, not the number of deposits, and includes zero periods', () => {
    const result = calculateSavingsProgress({
      ...goal,
      entries: [
        { amount: 100, createdAt: new Date('2026-08-10T12:00:00Z') },
        { amount: 150, createdAt: new Date('2026-08-11T12:00:00Z') },
        { amount: 200, createdAt: new Date('2026-09-30T12:00:00Z') },
      ],
    });
    expect(result.monthly.eligiblePeriods).toBe(3);
    expect(result.monthly.contributedPeriods).toBe(2);
    expect(result.monthly.missedPeriods).toBe(1);
    expect(result.monthly.percent).toBe(67);
    expect(result.monthly.rating).toBe('yellow');
    expect(result.weekly.periods).toHaveLength(12);
    expect(result.weekly.eligiblePeriods).toBe(11);
    expect(result.weekly.contributedPeriods).toBe(2);
    expect(result.recordedAmount).toBe(450);
    expect(result.displayedSavedAmount).toBe(600);
  });
  it('excludes the current period and partial starting period from missed scores', () => {
    const result = calculateSavingsProgress({
      ...goal,
      createdAt: new Date('2026-10-02T12:00:00Z'),
      entries: [],
    });
    expect(result.weekly.periods[0].status).toBe('partial');
    expect(result.weekly.periods.at(-1)?.status).toBe('in_progress');
    expect(result.weekly.missedPeriods).toBe(0);
    expect(result.weekly.percent).toBeNull();
    expect(result.monthly.rating).toBe('unavailable');
  });
  it('places boundary deposits in the customer-local calendar month', () => {
    const result = calculateSavingsProgress({
      ...goal,
      entries: [{ amount: 50, createdAt: new Date('2026-10-01T01:00:00Z') }],
    });
    expect(
      result.monthly.periods.find((p) => p.start === '2026-09-01')?.amount,
    ).toBe(50);
    expect(
      result.monthly.periods.find((p) => p.start === '2026-10-01')?.amount,
    ).toBe(0);
  });
  it('adds cents without floating-point drift and ignores future/zero/pre-creation entries', () => {
    const result = calculateSavingsProgress({
      ...goal,
      entries: [
        { amount: 0.1, createdAt: new Date('2026-09-01T12:00:00Z') },
        { amount: 0.2, createdAt: new Date('2026-09-01T12:00:00Z') },
        { amount: 100, createdAt: new Date('2026-10-06T12:00:00Z') },
        { amount: 0, createdAt: new Date('2026-09-01T12:00:00Z') },
        { amount: 99, createdAt: new Date('2026-06-01T12:00:00Z') },
      ],
    });
    expect(result.recordedAmount).toBe(0.3);
    expect(result.recordedCount).toBe(2);
    expect(result.monthly.periods.at(-1)?.cumulativeRecorded).toBe(0.3);
  });
  it('keeps cumulative older entries when the displayed chart window is shorter', () => {
    const result = calculateSavingsProgress({
      ...goal,
      createdAt: new Date('2025-01-01T12:00:00Z'),
      entries: [{ amount: 123, createdAt: new Date('2025-02-01T12:00:00Z') }],
    });
    expect(result.weekly.periods[0].cumulativeRecorded).toBe(123);
    expect(result.weekly.periods[0].amount).toBe(0);
  });
  it('has explicit inclusive color thresholds', () => {
    expect(consistencyRating(80)).toBe('green');
    expect(consistencyRating(79)).toBe('yellow');
    expect(consistencyRating(50)).toBe('yellow');
    expect(consistencyRating(49)).toBe('red');
    expect(consistencyRating(null)).toBe('unavailable');
  });
});
