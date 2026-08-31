import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { theme } from '@/constants/theme';

type QueryErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function QueryErrorState({ message, onRetry }: QueryErrorStateProps) {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <Text style={styles.title}>We couldn’t load this screen.</Text>
      <Text style={styles.message}>{message}</Text>
      <AppButton
        accessibilityLabel="Try again"
        onPress={onRetry}
        title="Try again"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
