import { Redirect } from 'expo-router';

export default function SignupRedirect() {
  return <Redirect href="/(auth)/register" />;
}
