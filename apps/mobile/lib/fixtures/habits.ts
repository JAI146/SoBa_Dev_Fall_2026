export type HabitCadence = 'daily' | 'weekly';

export interface HabitCompletion {
  date: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  goalId: string;
  title: string;
  description: string;
  cadence: HabitCadence;
  scheduledWeekdays: number[];
  preferredTime: string | null;
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  completionHistory: HabitCompletion[];
  createdAt: string;
}

const weekDates = [
  '2026-08-20',
  '2026-08-21',
  '2026-08-22',
  '2026-08-23',
  '2026-08-24',
  '2026-08-25',
  '2026-08-26',
] as const;

function history(completions: readonly boolean[]): HabitCompletion[] {
  return weekDates.map((date, index) => ({
    date,
    completed: completions[index] ?? false,
  }));
}

export const habitFixtures: Habit[] = [
  {
    id: 'habit-log-spending',
    goalId: 'goal-credit-card',
    title: 'Log today\'s spending',
    description: 'Notice where your money went without judging the choices.',
    cadence: 'daily',
    scheduledWeekdays: [0, 1, 2, 3, 4, 5, 6],
    preferredTime: '20:00',
    completedToday: true,
    currentStreak: 4,
    longestStreak: 11,
    completionHistory: history([true, false, true, true, true, true, true]),
    createdAt: '2026-06-10T09:00:00.000Z',
  },
  {
    id: 'habit-no-spend-day',
    goalId: 'goal-credit-card',
    title: 'Keep one no-spend day',
    description: 'Give the week one gentle pause from non-essential spending.',
    cadence: 'weekly',
    scheduledWeekdays: [3],
    preferredTime: null,
    completedToday: false,
    currentStreak: 0,
    longestStreak: 5,
    completionHistory: history([true, false, false, true, false, false, false]),
    createdAt: '2026-06-12T09:00:00.000Z',
  },
  {
    id: 'habit-move-savings',
    goalId: 'goal-emergency-cushion',
    title: 'Move $20 to your cushion',
    description: 'A small transfer that makes the unexpected feel more manageable.',
    cadence: 'weekly',
    scheduledWeekdays: [3],
    preferredTime: null,
    completedToday: false,
    currentStreak: 2,
    longestStreak: 6,
    completionHistory: history([false, true, false, false, true, false, false]),
    createdAt: '2026-05-20T09:00:00.000Z',
  },
  {
    id: 'habit-money-check-in',
    goalId: 'goal-trip-home',
    title: 'Take a five-minute money check-in',
    description: 'Look at what changed and choose one kind next step.',
    cadence: 'weekly',
    scheduledWeekdays: [3],
    preferredTime: null,
    completedToday: true,
    currentStreak: 3,
    longestStreak: 4,
    completionHistory: history([false, false, true, false, false, true, true]),
    createdAt: '2026-08-05T09:00:00.000Z',
  },
];

export const emptyHabitFixtures: Habit[] = [];
