import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingTitle?: string;
  variant?: 'primary' | 'soft' | 'outline';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingTitle,
  variant = 'primary',
  style,
  textStyle,
  accessibilityLabel,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      activeOpacity={0.82}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.button,
        isPrimary && styles.primaryButton,
        variant === 'soft' && styles.softButton,
        variant === 'outline' && styles.outlineButton,
        isDisabled && styles.disabledButton,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.white : theme.colors.deepGreen} size="small" />
      ) : null}
      <Text
        style={[
          styles.title,
          isPrimary ? styles.primaryTitle : styles.secondaryTitle,
          textStyle,
        ]}>
        {loading ? loadingTitle ?? title : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.deepGreen,
    ...theme.shadows.button,
  },
  softButton: {
    backgroundColor: theme.colors.lightMint,
  },
  outlineButton: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.62,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  primaryTitle: {
    color: theme.colors.white,
  },
  secondaryTitle: {
    color: theme.colors.deepGreen,
  },
});

export default AppButton;
