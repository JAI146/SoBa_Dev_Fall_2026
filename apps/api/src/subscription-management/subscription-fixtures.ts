import type { AdminPlanInput } from '@purposemint/contracts';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';

export function planInput(extra: Partial<AdminPlanInput> = {}): AdminPlanInput {
  return {
    key: 'foundation',
    name: 'Foundation',
    description: 'A configurable plan',
    tagline: '',
    badge: null,
    ctaLabel: 'Choose plan',
    priceMonthly: 9,
    priceYearly: 90,
    billingCycles: ['monthly', 'yearly'],
    features: ['Join challenges'],
    entitlements: { pathways: false, communityChallenges: true },
    limits: { pathwayApplications: null, challengeParticipations: 3 },
    active: true,
    isDefault: false,
    available: true,
    availableFrom: null,
    availableUntil: null,
    sortOrder: 10,
    promotion: null,
    ...extra,
  };
}
export function planEntity(extra: Partial<AdminPlanInput> = {}) {
  const input = planInput(extra);
  return Object.assign(new SubscriptionPlan(), input, {
    version: 1,
    availableFrom: input.availableFrom ? new Date(input.availableFrom) : null,
    availableUntil: input.availableUntil
      ? new Date(input.availableUntil)
      : null,
  });
}
