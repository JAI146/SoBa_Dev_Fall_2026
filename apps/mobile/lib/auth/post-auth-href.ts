import { OnboardingStatus, type UserPublic } from '@purposemint/contracts';
import type { Href } from 'expo-router';

export function postAuthHref(user: UserPublic | null | undefined): Href {
  if (!user) {
    return '/(auth)/login';
  }
  if (user.onboardingStatus !== OnboardingStatus.COMPLETED) {
    return '/(onboarding)';
  }
  return '/(tabs)';
}
