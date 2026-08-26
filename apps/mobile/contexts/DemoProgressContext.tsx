import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { goalFixtures, type Goal } from '@/lib/fixtures/goals';
import { emptyHabitFixtures, habitFixtures, type Habit } from '@/lib/fixtures/habits';

const SHOW_EMPTY_HABITS_DEMO = false;

type DemoProgressContextValue = {
  goals: Goal[];
  habits: Habit[];
  contributeToGoal: (goalId: string, amount: number) => void;
  toggleHabit: (habitId: string) => void;
};

const DemoProgressContext = createContext<DemoProgressContextValue | null>(null);

export function DemoProgressProvider({ children }: PropsWithChildren) {
  const [goals, setGoals] = useState<Goal[]>(goalFixtures);
  const [habits, setHabits] = useState<Habit[]>(
    SHOW_EMPTY_HABITS_DEMO ? emptyHabitFixtures : habitFixtures,
  );

  const contributeToGoal = useCallback((goalId: string, amount: number) => {
    const wholeAmount = Math.max(0, Math.round(amount));
    if (wholeAmount === 0) {
      return;
    }

    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              currentAmount: Math.min(goal.targetAmount, goal.currentAmount + wholeAmount),
            }
          : goal,
      ),
    );
  }, []);

  const toggleHabit = useCallback((habitId: string) => {
    setHabits((current) =>
      current.map((habit) => {
        if (habit.id !== habitId) {
          return habit;
        }

        const completedToday = !habit.completedToday;
        const completionHistory = habit.completionHistory.map((entry, index, entries) =>
          index === entries.length - 1 ? { ...entry, completed: completedToday } : entry,
        );

        return {
          ...habit,
          completedToday,
          completionHistory,
          currentStreak: completedToday
            ? habit.currentStreak + 1
            : Math.max(0, habit.currentStreak - 1),
        };
      }),
    );
  }, []);

  const value = useMemo(
    () => ({ goals, habits, contributeToGoal, toggleHabit }),
    [contributeToGoal, goals, habits, toggleHabit],
  );

  return <DemoProgressContext.Provider value={value}>{children}</DemoProgressContext.Provider>;
}

export function useDemoProgress() {
  const context = useContext(DemoProgressContext);

  if (!context) {
    throw new Error('useDemoProgress must be used inside DemoProgressProvider.');
  }

  return context;
}
