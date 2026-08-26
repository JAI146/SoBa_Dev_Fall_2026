import { type UserPublic } from '@purposemint/contracts';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api/client';

export const currentUserQueryKey = ['users', 'me'] as const;

export function useCurrentUser() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated,
    queryFn: () => apiRequest<UserPublic>('/users/me', { authenticated: true }),
    queryKey: currentUserQueryKey,
  });
}
