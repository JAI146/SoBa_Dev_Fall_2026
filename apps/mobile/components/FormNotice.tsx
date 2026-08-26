import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type FormNoticeProps = {
  message?: string;
  tone?: 'error' | 'neutral' | 'success';
};

export function FormNotice({ message, tone = 'error' }: FormNoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        tone === 'error' && styles.errorContainer,
        tone === 'success' && styles.successContainer,
      ]}>
      <Text
        style={[
          styles.message,
          tone === 'error' && styles.errorMessage,
          tone === 'success' && styles.successMessage,
        ]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.lavender,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: theme.spacing.sm,
  },
  errorContainer: {
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.danger,
  },
  successContainer: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.teal,
  },
  message: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  errorMessage: {
    color: theme.colors.danger,
  },
  successMessage: {
    color: theme.colors.mintDark,
  },
});
