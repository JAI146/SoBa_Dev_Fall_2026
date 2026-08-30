import {
  OnboardingStep,
  type DashboardPayload,
  type OnboardingContentResponse,
  type OnboardingProgress,
  type SaveOnboardingGoalInput,
  type SaveOnboardingHabitsInput,
  type SaveOnboardingValuesInput,
  type UpdateProfileInput,
  type UserPublic,
} from '@purposemint/contracts';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api/client';

export const onboardingContentQueryKey = ['onboarding', 'content'] as const;

type OnboardingContextValue = {
  content: OnboardingContentResponse | undefined;
  errorMessage: string | null;
  isLoading: boolean;
  progress: OnboardingProgress | undefined;
  refresh: () => Promise<void>;
  saveGoal: (input: SaveOnboardingGoalInput) => Promise<OnboardingContentResponse>;
  saveHabits: (input: SaveOnboardingHabitsInput) => Promise<OnboardingContentResponse>;
  saveValues: (input: SaveOnboardingValuesInput) => Promise<OnboardingContentResponse>;
  saveWelcome: (displayName: string) => Promise<void>;
  complete: () => Promise<DashboardPayload>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, updateSessionUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    enabled: isAuthenticated,
    queryFn: () =>
      apiRequest<OnboardingContentResponse>('/onboarding/content', {
        authenticated: true,
      }),
    queryKey: onboardingContentQueryKey,
  });

  const setContent = useCallback(
    (next: OnboardingContentResponse) => {
      queryClient.setQueryData(onboardingContentQueryKey, next);
    },
    [queryClient],
  );

  const saveWelcomeMutation = useMutation({
    mutationFn: (displayName: string) =>
      apiRequest<UserPublic, UpdateProfileInput>('/users/me', {
        authenticated: true,
        body: { displayName },
        method: 'PATCH',
      }),
    onSuccess: async (user) => {
      updateSessionUser(user);
      const next = await query.refetch();
      if (next.data) {
        setContent(next.data);
      }
    },
  });

  const saveValuesMutation = useMutation({
    mutationFn: (input: SaveOnboardingValuesInput) =>
      apiRequest<OnboardingContentResponse, SaveOnboardingValuesInput>('/onboarding/values', {
        authenticated: true,
        body: input,
        method: 'POST',
      }),
    onSuccess: setContent,
  });

  const saveGoalMutation = useMutation({
    mutationFn: (input: SaveOnboardingGoalInput) =>
      apiRequest<OnboardingContentResponse, SaveOnboardingGoalInput>('/onboarding/goal', {
        authenticated: true,
        body: input,
        method: 'POST',
      }),
    onSuccess: setContent,
  });

  const saveHabitsMutation = useMutation({
    mutationFn: (input: SaveOnboardingHabitsInput) =>
      apiRequest<OnboardingContentResponse, SaveOnboardingHabitsInput>('/onboarding/habits', {
        authenticated: true,
        body: input,
        method: 'POST',
      }),
    onSuccess: setContent,
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      apiRequest<DashboardPayload>('/onboarding/complete', {
        authenticated: true,
        method: 'POST',
      }),
    onSuccess: (payload) => {
      updateSessionUser(payload.user);
      queryClient.setQueryData(['dashboard'], payload);
    },
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const errorMessage =
    query.error instanceof Error
      ? query.error.message
      : saveWelcomeMutation.error instanceof Error
        ? saveWelcomeMutation.error.message
        : saveValuesMutation.error instanceof Error
          ? saveValuesMutation.error.message
          : saveGoalMutation.error instanceof Error
            ? saveGoalMutation.error.message
            : saveHabitsMutation.error instanceof Error
              ? saveHabitsMutation.error.message
              : completeMutation.error instanceof Error
                ? completeMutation.error.message
                : null;

  const value = useMemo<OnboardingContextValue>(
    () => ({
      complete: completeMutation.mutateAsync,
      content: query.data,
      errorMessage,
      isLoading: query.isLoading,
      progress: query.data?.progress,
      refresh,
      saveGoal: saveGoalMutation.mutateAsync,
      saveHabits: saveHabitsMutation.mutateAsync,
      saveValues: saveValuesMutation.mutateAsync,
      saveWelcome: async (displayName: string) => {
        await saveWelcomeMutation.mutateAsync(displayName);
      },
    }),
    [
      completeMutation.mutateAsync,
      errorMessage,
      query.data,
      query.isLoading,
      refresh,
      saveGoalMutation.mutateAsync,
      saveHabitsMutation.mutateAsync,
      saveValuesMutation.mutateAsync,
      saveWelcomeMutation,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used inside OnboardingProvider.');
  }
  return context;
}

export function hrefForOnboardingStep(step: string) {
  switch (step) {
    case OnboardingStep.VALUES:
      return '/(onboarding)/values' as const;
    case OnboardingStep.PURPOSE_MAP:
      return '/(onboarding)/purpose-map' as const;
    case OnboardingStep.HABITS:
      return '/(onboarding)/habits' as const;
    default:
      return '/(onboarding)/welcome' as const;
  }
}
