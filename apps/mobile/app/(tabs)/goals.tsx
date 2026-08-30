import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { theme } from '@/constants/theme';

export default function GoalsScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Goals</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
});
