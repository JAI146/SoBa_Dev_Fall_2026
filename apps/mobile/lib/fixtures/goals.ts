export type GoalStatus = 'active' | 'completed' | 'paused';

export type GoalCategory = 'emergency_fund' | 'debt_payoff' | 'family_travel';

export interface Goal {
  id: string;
  title: string;
  description: string;
  encouragement: string;
  category: GoalCategory;
  valueName: string;
  currentAmount: number;
  targetAmount: number;
  status: GoalStatus;
  createdAt: string;
  targetDate: string;
}

export const goalFixtures: Goal[] = [
  {
    id: 'goal-emergency-cushion',
    title: 'Build a little more breathing room',
    description: 'An emergency cushion for the moments you cannot plan for.',
    encouragement: 'You are closer than you were last month.',
    category: 'emergency_fund',
    valueName: 'Security',
    currentAmount: 340,
    targetAmount: 500,
    status: 'active',
    createdAt: '2026-05-18T09:00:00.000Z',
    targetDate: '2026-10-31T23:59:59.000Z',
  },
  {
    id: 'goal-credit-card',
    title: 'Make the card feel lighter',
    description: 'Clear the balance and make more room in each month.',
    encouragement: 'The finish line is close enough to see.',
    category: 'debt_payoff',
    valueName: 'Freedom',
    currentAmount: 1840,
    targetAmount: 2000,
    status: 'active',
    createdAt: '2026-02-02T09:00:00.000Z',
    targetDate: '2026-09-30T23:59:59.000Z',
  },
  {
    id: 'goal-trip-home',
    title: 'Make the trip home possible',
    description: 'Set aside the fare for unhurried time with family.',
    encouragement: 'Every small transfer brings the visit closer.',
    category: 'family_travel',
    valueName: 'Family',
    currentAmount: 150,
    targetAmount: 900,
    status: 'active',
    createdAt: '2026-08-03T09:00:00.000Z',
    targetDate: '2027-02-15T23:59:59.000Z',
  },
];
