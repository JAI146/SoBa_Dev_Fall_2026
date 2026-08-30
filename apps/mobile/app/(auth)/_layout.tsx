import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { postAuthHref } from '@/lib/auth/post-auth-href';

export default function AuthLayout() {
  const { isAuthenticated, session } = useAuth();

  if (isAuthenticated) {
    return <Redirect href={postAuthHref(session?.user)} />;
  }

  return <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }} />;
}
