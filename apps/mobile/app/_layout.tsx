import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { QueryLifecycleManager } from '@/components/QueryLifecycleManager';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/query/query-client';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryLifecycleManager />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { isBootstrapping } = useAuth();

  useEffect(() => {
    if (!isBootstrapping) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isBootstrapping]);

  if (isBootstrapping) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(pathways)" />
        <Stack.Screen name="manage-habits" />
        <Stack.Screen name="edit-values" />
        <Stack.Screen name="pricing" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
