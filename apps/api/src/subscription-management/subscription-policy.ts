import { BadRequestException } from '@nestjs/common';
import type { BillingTerms } from '@purposemint/contracts';
import type { SubscriptionPlan } from '../entities/subscription-plan.entity';

/** Calendar periods clamp Jan 31 / leap day rather than spilling into March. */
export function nextRenewal(start: Date, cycle: BillingTerms['cycle']): Date {
  const next = new Date(start);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  if (cycle === 'yearly') next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export function planAvailable(
  plan: SubscriptionPlan,
  at = new Date(),
): boolean {
  return (
    plan.active &&
    plan.available &&
    (!plan.availableFrom || plan.availableFrom <= at) &&
    (!plan.availableUntil || plan.availableUntil > at)
  );
}

export function captureTerms(
  plan: SubscriptionPlan,
  cycle: BillingTerms['cycle'],
  at: Date,
): BillingTerms {
  if (!planAvailable(plan, at))
    throw new BadRequestException(
      'This plan is not available at the effective date.',
    );
  if (!plan.billingCycles.includes(cycle))
    throw new BadRequestException(
      'This billing cycle is not offered by the plan.',
    );
  const regular = cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  if (regular === null)
    throw new BadRequestException(
      'This plan has no price for that billing cycle.',
    );
  const promotion = plan.promotion;
  const promotional =
    promotion &&
    Date.parse(promotion.startsAt) <= at.getTime() &&
    Date.parse(promotion.endsAt) > at.getTime()
      ? cycle === 'monthly'
        ? promotion.monthlyPrice
        : promotion.yearlyPrice
      : null;
  return {
    planKey: plan.key,
    planName: plan.name,
    planVersion: plan.version,
    cycle,
    currency: 'USD',
    amountCents: Math.round((promotional ?? regular) * 100),
    regularAmountCents: Math.round(regular * 100),
    promotionEndsAt: promotional !== null ? promotion!.endsAt : null,
  };
}

export function changeAction(
  previous: BillingTerms | null,
  next: BillingTerms,
): string {
  if (!previous) return 'assigned';
  if (previous.planKey === next.planKey)
    return previous.cycle === next.cycle ? 'repriced' : 'cycle_changed';
  const oldPrice =
    previous.regularAmountCents / (previous.cycle === 'yearly' ? 12 : 1);
  const newPrice = next.regularAmountCents / (next.cycle === 'yearly' ? 12 : 1);
  return newPrice > oldPrice
    ? 'upgraded'
    : newPrice < oldPrice
      ? 'downgraded'
      : 'plan_changed';
}
