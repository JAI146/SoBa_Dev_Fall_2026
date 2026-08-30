import { OnboardingStatus } from '@purposemint/contracts';
import { Redirect, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

export default function OnboardingLayout() {
  const { isAuthenticated, session } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session?.user.onboardingStatus === OnboardingStatus.COMPLETED) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <OnboardingProvider>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <OnboardingStepper />
        <View style={styles.stack}>
          <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }} />
        </View>
      </SafeAreaView>
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.cream,
    flex: 1,
  },
  stack: {
    flex: 1,
  },
});
