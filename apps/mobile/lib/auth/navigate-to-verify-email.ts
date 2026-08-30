import type { RegisterPendingResponse } from '@purposemint/contracts';
import { router } from 'expo-router';

export function navigateToVerifyEmail(
  pending: Pick<RegisterPendingResponse, 'email' | 'message'>,
) {
  router.replace({
    pathname: '/(auth)/verify-email',
    params: { email: pending.email, message: pending.message },
  });
}
