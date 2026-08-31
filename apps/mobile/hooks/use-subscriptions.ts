import type {
  CreateUpgradeIntentInput,
  SubscriptionPlansResponse,
  UpgradeIntentResponse,
} from '@purposemint/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api/client';

export const subscriptionPlansQueryKey = ['subscription-plans'] as const;

export function useSubscriptionPlans() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    enabled: isAuthenticated,
    queryKey: subscriptionPlansQueryKey,
    queryFn: () =>
      apiRequest<SubscriptionPlansResponse>('/subscriptions/plans', {
        authenticated: true,
      }),
  });
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
