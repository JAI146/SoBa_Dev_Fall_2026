import { Redirect } from 'expo-router';

import { OnboardingLoading } from '@/components/onboarding/OnboardingLoading';
import { QueryErrorState } from '@/components/QueryErrorState';
import { hrefForOnboardingStep, useOnboarding } from '@/contexts/OnboardingContext';

export default function OnboardingIndex() {
  const { errorMessage, isLoading, progress, refresh } = useOnboarding();

  if (errorMessage && !progress) {
    return <QueryErrorState message={errorMessage} onRetry={() => void refresh()} />;
  }

  if (isLoading || !progress) {
    return <OnboardingLoading />;
  }

  return <Redirect href={hrefForOnboardingStep(progress.currentStep)} />;
}
