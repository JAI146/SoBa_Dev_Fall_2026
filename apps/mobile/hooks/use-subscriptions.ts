import {
  type CreateUpgradeIntentInput,
  type SubscriptionPlansResponse,
  type UpgradeIntentResponse,
  subscriptionPlansResponseSchema,
} from '@purposemint/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api/client';

export const subscriptionPlansQueryKey = ['subscription-plans'] as const;

export function useSubscriptionPlans() {
  const { isAuthenticated, session } = useAuth();
  const query = useQuery({
    enabled: isAuthenticated,
    queryKey: [...subscriptionPlansQueryKey, session?.user.id],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    queryFn: async () => {
      const response = await apiRequest<SubscriptionPlansResponse>(
        '/subscriptions/plans',
        {
          authenticated: true,
        },
      );
      return subscriptionPlansResponseSchema.parse(response);
    },
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) void refetch();
    }, [isAuthenticated, refetch]),
  );
  return query;
}

export function useUpgradeIntent() {
  return useMutation({
    mutationFn: (input: CreateUpgradeIntentInput) =>
      apiRequest<UpgradeIntentResponse, CreateUpgradeIntentInput>(
        '/subscriptions/upgrade-intent',
        {
          authenticated: true,
          method: 'POST',
          body: input,
        },
      ),
  });
}
