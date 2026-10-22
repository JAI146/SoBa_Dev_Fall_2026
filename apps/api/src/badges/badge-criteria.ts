import type { BadgeRule } from '@purposemint/contracts';

export type BadgeMetrics = Record<BadgeRule['variable'], number | null>;

export function meetsBadgeCriteria(
  criteria: BadgeRule[],
  metrics: BadgeMetrics,
): boolean {
  return (
    criteria.length > 0 &&
    criteria.every((rule) => {
      const actual = metrics[rule.variable];
      // Missing progress cannot qualify, even when the condition is negated.
      if (actual === null || !Number.isFinite(actual)) return false;
      let matches: boolean;
      switch (rule.operator) {
        case '=':
          matches = actual === rule.value;
          break;
        case '<':
          matches = actual < rule.value;
          break;
        case '<=':
          matches = actual <= rule.value;
          break;
        case '>':
          matches = actual > rule.value;
          break;
        case '>=':
          matches = actual >= rule.value;
          break;
      }
      return rule.not ? !matches : matches;
    })
  );
}
