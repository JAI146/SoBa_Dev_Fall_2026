import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }} />;
}
