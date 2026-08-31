import {
  type CreateGoalInput,
  type CreateSavingsInput,
  type CreateSavingsResponse,
  type DashboardPayload,
  type HabitCompleteResponse,
  type JoinChallengeResponse,
  type UserGoalPublic,
} from '@purposemint/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api/client';

export const dashboardQueryKey = ['dashboard'] as const;

export function useDashboard() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    enabled: isAuthenticated,
    queryFn: () => apiRequest<DashboardPayload>('/dashboard', { authenticated: true }),
    queryKey: dashboardQueryKey,
  });

  const completeHabit = useMutation({
    mutationFn: (userHabitId: string) =>
      apiRequest<HabitCompleteResponse>(`/habits/${userHabitId}/complete`, {
        authenticated: true,
        method: 'POST',
      }),
    onMutate: async (userHabitId) => {
      await queryClient.cancelQueries({ queryKey: dashboardQueryKey });
      const previous = queryClient.getQueryData<DashboardPayload>(dashboardQueryKey);
      if (previous) {
        queryClient.setQueryData<DashboardPayload>(dashboardQueryKey, {
          ...previous,
          habits: previous.habits.map((habit) =>
            habit.id === userHabitId
              ? { ...habit, completedToday: !habit.completedToday }
              : habit,
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dashboardQueryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });

  const logSavings = useMutation({
    mutationFn: (input: CreateSavingsInput) =>
      apiRequest<CreateSavingsResponse, CreateSavingsInput>('/savings', {
        authenticated: true,
        body: input,
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });

  const setFocusGoal = useMutation({
    mutationFn: (goalId: string) =>
      apiRequest<UserGoalPublic, { isFocus: true }>(`/goals/${goalId}`, {
        authenticated: true,
        body: { isFocus: true },
        method: 'PATCH',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });

  const joinChallenge = useMutation({
    mutationFn: (challengeId: string) =>
      apiRequest<JoinChallengeResponse>(
        `/community-challenges/${challengeId}/join`,
        { authenticated: true, method: 'POST' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });

  const createGoal = useMutation({
    mutationFn: (input: CreateGoalInput) =>
      apiRequest<UserGoalPublic, CreateGoalInput>('/goals', {
        authenticated: true,
        body: input,
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
    },
  });

  return {
    ...query,
    completeHabit: completeHabit.mutate,
    createGoal: createGoal.mutateAsync,
    logSavings: logSavings.mutateAsync,
    loggingSavings: logSavings.isPending,
    joinChallenge: joinChallenge.mutateAsync,
    joiningChallenge: joinChallenge.isPending,
    setFocusGoal: setFocusGoal.mutateAsync,
  };
}
