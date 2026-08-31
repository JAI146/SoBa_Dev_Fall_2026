import { Tier } from '@purposemint/contracts';
import type { CommunityChallenge } from '../entities/community-challenge.entity';
import type { SubscriptionPlan } from '../entities/subscription-plan.entity';

export const SEEDED_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    key: Tier.FREE,
    name: 'Starter',
    tagline: 'Start your savings journey',
    priceMonthly: 0,
    badge: null,
    description:
      'Build the habit first. Track your savings goal by hand — no account required.',
    features: [
      'Set your savings goal',
      'Log what you save manually (no linked account)',
      'Track habits that impact your money',
      'Visualize progress with PurposeMap™',
      'Gentle nudges to stay consistent',
    ],
    ctaLabel: 'Start Free',
    sortOrder: 1,
  },
  {
    key: Tier.GROWTH,
    name: 'Momentum',
    tagline: 'Open your account and save automatically',
    priceMonthly: 19,
    badge: 'Core Plan',
    description:
      'Upgrade here to open your PurposeMint savings account — this is where manual tracking becomes real, automatic saving.',
    features: [
      'Opens your PurposeMint savings account at our partner bank',
      'Smart automatic transfers based on your habits',
      'Unlimited savings goals',
      'Weekly habit + emotion tracking',
      'Community challenge board',
      '"Pause mode" when life happens',
    ],
    ctaLabel: 'Upgrade to Momentum',
    sortOrder: 2,
  },
  {
    key: Tier.ELEVATE,
    name: 'Elevation',
    tagline: 'Unlock Level 5 Pathways',
    priceMonthly: 49,
    badge: null,
    description:
      "Everything in Momentum, plus Pathways — turn what you've saved into a car, housing, childcare, or training.",
    features: [
      'Everything in Momentum, plus:',
      'Level 5: Pathways access + partner matching',
      'Savings rewards + milestone bonuses',
      'Partner discounts that grow over time',
      'Savings streak tracking + gamification',
      'Group coaching calls',
      'Advanced behavior insights',
    ],
    ctaLabel: 'Upgrade to Elevation',
    sortOrder: 3,
  },
];

type SeededChallenge = Omit<CommunityChallenge, 'id' | 'participations'>;

export const SEEDED_COMMUNITY_CHALLENGES: SeededChallenge[] = [
  {
    key: 'no-spend-weekend-2026-08',
    title: 'No-Spend Weekend Challenge',
    description: 'Skip one weekend of spending & save the difference',
    activeMonth: '2026-08-01',
    isActive: true,
    sortOrder: 1,
  },
  {
    key: 'cook-what-you-have-2026-09',
    title: 'Cook-What-You-Have Challenge',
    description:
      'Build one week of meals around what is already in your kitchen',
    activeMonth: '2026-09-01',
    isActive: true,
    sortOrder: 1,
  },
  {
    key: 'one-bill-check-in-2026-10',
    title: 'One-Bill Check-In',
    description:
      'Review one recurring bill and decide whether it still serves your life',
    activeMonth: '2026-10-01',
    isActive: true,
    sortOrder: 1,
  },
  {
    key: 'small-gift-plan-2026-11',
    title: 'Small-Gift Plan',
    description:
      'Choose a holiday spending amount that leaves room for the rest of your month',
    activeMonth: '2026-11-01',
    isActive: true,
    sortOrder: 1,
  },
];
