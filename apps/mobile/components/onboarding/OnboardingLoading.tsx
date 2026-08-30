import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';

export function OnboardingLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.deepGreen} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
