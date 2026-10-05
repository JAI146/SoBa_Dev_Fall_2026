import { meetsBadgeCriteria, type BadgeMetrics } from './badge-criteria';
import type { BadgeRule } from '@purposemint/contracts';

const metrics: BadgeMetrics = {
  savings_progress: 50,
  saved_amount: 100,
  completed_goals: 1,
  habit_completions: 3,
  reflections: 2,
  current_level: null,
};
describe('Badge criteria', () => {
  it.each<[BadgeRule['operator'], number, boolean]>([
    ['=', 100, true],
    ['=', 99, false],
    ['<', 100, false],
    ['<', 101, true],
    ['<=', 100, true],
    ['<=', 99, false],
    ['>', 100, false],
    ['>', 99, true],
    ['>=', 100, true],
    ['>=', 101, false],
  ])('compares saved_amount %s %s', (operator, value, expected) => {
    const rule: BadgeRule = {
      variable: 'saved_amount',
      operator,
      value,
      not: false,
    };
    expect(meetsBadgeCriteria([rule], metrics)).toBe(expected);
    expect(meetsBadgeCriteria([{ ...rule, not: true }], metrics)).toBe(
      !expected,
    );
  });
  it('requires every rule and rejects unavailable or empty criteria', () => {
    expect(meetsBadgeCriteria([], metrics)).toBe(false);
    expect(
      meetsBadgeCriteria(
        [{ variable: 'current_level', operator: '=', value: 1, not: true }],
        metrics,
      ),
    ).toBe(false);
    expect(
      meetsBadgeCriteria(
        [
          {
            variable: 'habit_completions',
            operator: '>=',
            value: 3,
            not: false,
          },
          { variable: 'reflections', operator: '>', value: 2, not: false },
        ],
        metrics,
      ),
    ).toBe(false);
  });
});
