import { Redirect } from 'expo-router';

import { OnboardingLoading } from '@/components/onboarding/OnboardingLoading';
import { hrefForOnboardingStep, useOnboarding } from '@/contexts/OnboardingContext';

export default function OnboardingIndex() {
  const { isLoading, progress } = useOnboarding();

  if (isLoading || !progress) {
    return <OnboardingLoading />;
  }

  return <Redirect href={hrefForOnboardingStep(progress.currentStep)} />;
}
