/**
 * Converts each requested event into signed balance changes without writing data.
 * Rejects duplicate awards, invalid reversals, and negative or overspent balances
 * across both the whole benefit and individual goal/category allocations.
 */
import { BadRequestException } from '@nestjs/common';
import type { IncentiveEventInput } from '@purposemint/contracts';

export interface LedgerEntry {
  id: string;
  kind: string;
  amountCents: number;
  earnedDelta: number;
  distributedDelta: number;
  allocatedDelta: number;
  withdrawnDelta: number;
  goalId: string | null;
  category: string | null | undefined;
  reversesEventId: string | null;
}
export function ledgerBalance(events: LedgerEntry[]) {
  return events.reduce(
    (balance, entry) => ({
      earned: balance.earned + entry.earnedDelta,
      distributed: balance.distributed + entry.distributedDelta,
      allocated: balance.allocated + entry.allocatedDelta,
      withdrawn: balance.withdrawn + entry.withdrawnDelta,
    }),
    { earned: 0, distributed: 0, allocated: 0, withdrawn: 0 },
  );
}

/** Validates both the total and each goal/category balance, under a benefit row lock. */
export function nextLedgerEntry(
  input: IncentiveEventInput,
  events: LedgerEntry[],
  awardAmount: number,
) {
  const entry = {
    kind: input.kind,
    amountCents: input.amountCents,
    earnedDelta: 0,
    distributedDelta: 0,
    allocatedDelta: 0,
    withdrawnDelta: 0,
    goalId: input.goalId ?? null,
    category: input.category ?? null,
    reversesEventId: input.reversesEventId ?? null,
  };
  switch (input.kind) {
    case 'award':
      if (
        events.some((entry) => entry.kind === 'award') ||
        input.amountCents !== awardAmount
      )
        throw new BadRequestException(
          'This benefit can be earned once, for its snapshotted amount.',
        );
      entry.earnedDelta = input.amountCents;
      break;
    case 'distribution':
      entry.distributedDelta = input.amountCents;
      break;
    case 'allocation':
      entry.allocatedDelta = input.amountCents;
      break;
    case 'release':
      entry.allocatedDelta = -input.amountCents;
      break;
    case 'withdrawal':
      entry.withdrawnDelta = input.amountCents;
      if (input.goalId) entry.allocatedDelta = -input.amountCents;
      break;
    case 'reversal': {
      const original = events.find(
        (entry) => entry.id === input.reversesEventId,
      );
      if (
        !original ||
        ['award', 'eligibility', 'reversal'].includes(original.kind)
      )
        throw new BadRequestException(
          'Only a distribution, allocation, release, or withdrawal can be reversed.',
        );
      if (events.some((entry) => entry.reversesEventId === original.id))
        throw new BadRequestException('This event has already been reversed.');
      if (input.amountCents !== original.amountCents)
        throw new BadRequestException(
          'A reversal must match the original amount.',
        );
      Object.assign(entry, {
        goalId: original.goalId,
        category: original.category ?? null,
        distributedDelta: -original.distributedDelta,
        allocatedDelta: -original.allocatedDelta,
        withdrawnDelta: -original.withdrawnDelta,
      });
    }
  }
  const entries = [...events, { ...entry, id: '' }];
  const balance = ledgerBalance(entries);
  if (
    Math.min(
      balance.earned,
      balance.distributed,
      balance.allocated,
      balance.withdrawn,
    ) < 0 ||
    balance.distributed > balance.earned ||
    balance.withdrawn + balance.allocated > balance.distributed
  )
    throw new BadRequestException(
      'The event exceeds the recorded available balance. Release allocations before withdrawing unallocated funds or reversing a distribution.',
    );
  const allocations = new Map<string, number>();
  for (const event of entries) {
    if (!event.goalId) continue;
    const key = `${event.goalId}:${event.category}`;
    allocations.set(key, (allocations.get(key) ?? 0) + event.allocatedDelta);
  }
  if ([...allocations.values()].some((amount) => amount < 0))
    throw new BadRequestException(
      'The event exceeds the recorded allocation for this goal and category.',
    );
  return entry;
}
