import { Stack } from 'expo-router';

export default function GoalsLayout() {
  return <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }} />;
}
