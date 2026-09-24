/**
 * Tests balance limits, once-only awards, goal allocations, and reversal ordering,
 * plus request validation that rejects invalid amounts, dates, and event fields.
 */
import { randomUUID } from 'crypto';
import {
  incentiveEventInputSchema,
  incentiveProgramInputSchema,
  incentiveQuerySchema,
  type IncentiveEventInput,
} from '@purposemint/contracts';
import {
  ledgerBalance,
  nextLedgerEntry,
  type LedgerEntry,
} from './incentive-ledger';

function input(
  kind: IncentiveEventInput['kind'],
  amountCents = 1000,
  extra: Partial<IncentiveEventInput> = {},
): IncentiveEventInput {
  return {
    kind,
    amountCents,
    reason: 'Documented test evidence',
    reference: randomUUID(),
    idempotencyKey: randomUUID(),
    occurredAt: new Date().toISOString(),
    ...extra,
  };
}

describe('incentive ledger', () => {
  let events: LedgerEntry[];
  const goalId = randomUUID();
  const goal = { goalId, category: 'home' as const };

  function record(event: IncentiveEventInput) {
    const result = {
      ...nextLedgerEntry(event, events, 1000),
      id: randomUUID(),
    };
    events.push(result);
    return result;
  }
  beforeEach(() => {
    events = [];
  });

  it('does not distribute unearned money or award a different amount', () => {
    expect(() => record(input('distribution'))).toThrow();
    expect(() => record(input('award', 900))).toThrow();
  });

  it('preserves the once-only award after all money is withdrawn', () => {
    record(input('award'));
    record(input('distribution'));
    record(input('withdrawal'));
    expect(ledgerBalance(events)).toEqual({
      earned: 1000,
      distributed: 1000,
      allocated: 0,
      withdrawn: 1000,
    });
    expect(() => record(input('award'))).toThrow();
    expect(() => record(input('distribution', 1))).toThrow();
  });

  it('supports partial allocations and withdrawals without double-counting', () => {
    record(input('award'));
    record(input('distribution'));
    record(input('allocation', 700, goal));
    record(input('withdrawal', 200, goal));
    expect(ledgerBalance(events)).toEqual({
      earned: 1000,
      distributed: 1000,
      allocated: 500,
      withdrawn: 200,
    });
    expect(() => record(input('withdrawal', 301))).toThrow();
    record(input('withdrawal', 300));
    expect(ledgerBalance(events).withdrawn).toBe(500);
  });

  it('prevents taking an allocation from another goal or category', () => {
    record(input('award'));
    record(input('distribution'));
    record(input('allocation', 1000, goal));
    expect(() =>
      record(input('release', 1, { ...goal, category: 'business' })),
    ).toThrow();
    expect(() =>
      record(input('withdrawal', 1, { ...goal, goalId: randomUUID() })),
    ).toThrow();
  });

  it('reverses dependent events in order, never changing the original entry', () => {
    record(input('award'));
    const distribution = record(input('distribution'));
    const allocation = record(input('allocation', 1000, goal));
    const withdrawal = record(input('withdrawal', 200, goal));
    expect(() =>
      record(input('reversal', 1000, { reversesEventId: distribution.id })),
    ).toThrow();
    expect(() =>
      record(input('reversal', 1000, { reversesEventId: allocation.id })),
    ).toThrow();
    record(input('reversal', 200, { reversesEventId: withdrawal.id }));
    record(input('reversal', 1000, { reversesEventId: allocation.id }));
    record(input('reversal', 1000, { reversesEventId: distribution.id }));
    expect(distribution.distributedDelta).toBe(1000);
    expect(ledgerBalance(events)).toEqual({
      earned: 1000,
      distributed: 0,
      allocated: 0,
      withdrawn: 0,
    });
    expect(() =>
      record(input('reversal', 1000, { reversesEventId: distribution.id })),
    ).toThrow();
  });

  it('does not reverse awards, nonexistent events, or mismatched amounts', () => {
    const award = record(input('award'));
    const distribution = record(input('distribution'));
    expect(() =>
      record(input('reversal', 1000, { reversesEventId: award.id })),
    ).toThrow();
    expect(() =>
      record(input('reversal', 1000, { reversesEventId: randomUUID() })),
    ).toThrow();
    expect(() =>
      record(input('reversal', 500, { reversesEventId: distribution.id })),
    ).toThrow();
  });
});

describe('incentive request validation', () => {
  it('requires a goal and category for an allocation', () => {
    expect(
      incentiveEventInputSchema.safeParse(input('allocation')).success,
    ).toBe(false);
    expect(
      incentiveEventInputSchema.safeParse(
        input('allocation', 1000, { goalId: randomUUID() }),
      ).success,
    ).toBe(false);
  });
  it('rejects fractional cents, invalid dates, and unsupported fields', () => {
    expect(
      incentiveEventInputSchema.safeParse(input('award', 0.5)).success,
    ).toBe(false);
    expect(
      incentiveEventInputSchema.safeParse({ ...input('award'), source: 'bank' })
        .success,
    ).toBe(false);
    expect(incentiveQuerySchema.safeParse({ from: '2026-02-30' }).success).toBe(
      false,
    );
    expect(
      incentiveQuerySchema.safeParse({ from: '2026-09-22', to: '2026-09-21' })
        .success,
    ).toBe(false);
  });
  it('does not activate a provisional program', () => {
    expect(
      incentiveProgramInputSchema.safeParse({
        name: 'Welcome Bonus',
        amountCents: 1000,
        active: true,
        rulesProvisional: true,
        eligibilityDescription: 'Provisional staff review',
        version: 1,
      }).success,
    ).toBe(false);
  });
});
