import {
  HabitCategory,
  HabitFrequency,
  type HabitCategoryValue,
  type HabitFrequencyValue,
} from '@purposemint/contracts';

export const VALUE_HEADLINE_WORDS: Record<string, string> = {
  financial_peace: 'peace',
  progress: 'progress',
  stability: 'stability',
  joy_self_care: 'joy',
  family_first: 'family',
  independence: 'independence',
  confidence: 'confidence',
  balance: 'balance',
  learning_skills: 'learning',
};

export const SEEDED_VALUES = [
  {
    key: 'financial_peace',
    label: 'Financial Peace',
    description: 'Cover bills without borrowing',
    iconName: 'heart',
    colorToken: 'pink',
    sortOrder: 1,
  },
  {
    key: 'progress',
    label: 'Progress',
    description: 'Build something week by week',
    iconName: 'trending-up',
    colorToken: 'blue',
    sortOrder: 2,
  },
  {
    key: 'stability',
    label: 'Stability',
    description: 'Handle emergencies without a payday loan',
    iconName: 'shield-checkmark',
    colorToken: 'green',
    sortOrder: 3,
  },
  {
    key: 'joy_self_care',
    label: 'Joy & Self-Care',
    description: 'Treat yourself without guilt',
    iconName: 'sparkles',
    colorToken: 'orange',
    sortOrder: 4,
  },
  {
    key: 'family_first',
    label: 'Family First',
    description: 'Kids, groceries, school supplies',
    iconName: 'people',
    colorToken: 'purple',
    sortOrder: 5,
  },
  {
    key: 'independence',
    label: 'Independence',
    description: 'Stop relying on others for money',
    iconName: 'disc',
    colorToken: 'sky',
    sortOrder: 6,
  },
  {
    key: 'confidence',
    label: 'Confidence',
    description: 'Check your balance without anxiety',
    iconName: 'flash',
    colorToken: 'gold',
    sortOrder: 7,
  },
  {
    key: 'balance',
    label: 'Balance',
    description: 'Enjoy today, still save for tomorrow',
    iconName: 'happy',
    colorToken: 'teal',
    sortOrder: 8,
  },
  {
    key: 'learning_skills',
    label: 'Learning & Skills',
    description: 'Learn new skills to earn more',
    iconName: 'book',
    colorToken: 'red',
    sortOrder: 9,
  },
] as const;

export const SEEDED_GOAL_TEMPLATES: ReadonlyArray<{
  title: string;
  valueKey: string;
  targetAmount: number;
  isPathwayEligible: boolean;
  iconEmoji: string;
  sortOrder: number;
}> = [
  {
    title: "'Just in case' emergency stash",
    valueKey: 'financial_peace',
    targetAmount: 100,
    isPathwayEligible: false,
    iconEmoji: '🛡️',
    sortOrder: 1,
  },
  {
    title: 'Reliable vehicle down payment',
    valueKey: 'financial_peace',
    targetAmount: 1500,
    isPathwayEligible: true,
    iconEmoji: '🚗',
    sortOrder: 2,
  },
  {
    title: 'Rent buffer & housing stability',
    valueKey: 'financial_peace',
    targetAmount: 1500,
    isPathwayEligible: true,
    iconEmoji: '🏠',
    sortOrder: 3,
  },
  {
    title: 'Career certification fund',
    valueKey: 'progress',
    targetAmount: 350,
    isPathwayEligible: true,
    iconEmoji: '🎓',
    sortOrder: 4,
  },
  {
    title: 'Side hustle or business starter',
    valueKey: 'progress',
    targetAmount: 1000,
    isPathwayEligible: true,
    iconEmoji: '💼',
    sortOrder: 5,
  },
  {
    title: 'Resume or headshot refresh',
    valueKey: 'progress',
    targetAmount: 60,
    isPathwayEligible: false,
    iconEmoji: '📷',
    sortOrder: 6,
  },
  {
    title: 'Housing security deposit savings',
    valueKey: 'stability',
    targetAmount: 1500,
    isPathwayEligible: true,
    iconEmoji: '🏡',
    sortOrder: 7,
  },
  {
    title: 'Car repair & vehicle fund',
    valueKey: 'stability',
    targetAmount: 1500,
    isPathwayEligible: true,
    iconEmoji: '🔧',
    sortOrder: 8,
  },
  {
    title: 'Childcare rainy day fund',
    valueKey: 'stability',
    targetAmount: 500,
    isPathwayEligible: true,
    iconEmoji: '👶',
    sortOrder: 9,
  },
];

export const SEEDED_HABIT_TEMPLATES: ReadonlyArray<{
  title: string;
  description: string;
  frequency: HabitFrequencyValue;
  category: HabitCategoryValue;
  iconEmoji: string;
  sortOrder: number;
}> = [
  {
    title: 'Transfer Tuesday',
    description: 'Move $5 to savings every Tuesday',
    frequency: HabitFrequency.WEEKLY,
    category: HabitCategory.MONEY,
    iconEmoji: '🐷',
    sortOrder: 1,
  },
  {
    title: 'Money Journal',
    description: 'Write 3 sentences about your spending today',
    frequency: HabitFrequency.DAILY,
    category: HabitCategory.MONEY,
    iconEmoji: '📓',
    sortOrder: 2,
  },
  {
    title: 'No-Spend Saturday',
    description: 'Challenge yourself to spend $0 one day',
    frequency: HabitFrequency.WEEKLY,
    category: HabitCategory.MONEY,
    iconEmoji: '🚫',
    sortOrder: 3,
  },
  {
    title: 'Coffee Fund Redirect',
    description: 'Skip one coffee, save the $5',
    frequency: HabitFrequency.WEEKLY,
    category: HabitCategory.MONEY,
    iconEmoji: '☕',
    sortOrder: 4,
  },
  {
    title: 'Mood Check-In',
    description: 'Log how you feel before spending',
    frequency: HabitFrequency.DAILY,
    category: HabitCategory.MINDSET,
    iconEmoji: '🥰',
    sortOrder: 5,
  },
  {
    title: 'Weekly Goal Review',
    description: 'Check your progress every Sunday',
    frequency: HabitFrequency.WEEKLY,
    category: HabitCategory.MOTIVATION,
    iconEmoji: '🎯',
    sortOrder: 6,
  },
  {
    title: 'Affirmation Moment',
    description: 'Say one positive money affirmation',
    frequency: HabitFrequency.DAILY,
    category: HabitCategory.MOTIVATION,
    iconEmoji: '💪',
    sortOrder: 7,
  },
  {
    title: 'List Before Shopping',
    description: 'Write a list before any purchase',
    frequency: HabitFrequency.AS_NEEDED,
    category: HabitCategory.MINDSET,
    iconEmoji: '🛒',
    sortOrder: 8,
  },
];
