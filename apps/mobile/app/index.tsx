import { Redirect } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { postAuthHref } from '@/lib/auth/post-auth-href';

export default function SplashScreen() {
  const { isAuthenticated, session } = useAuth();
  return <Redirect href={isAuthenticated ? postAuthHref(session?.user) : '/(auth)/login'} />;
}
