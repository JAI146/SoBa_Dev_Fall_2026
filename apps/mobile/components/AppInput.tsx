import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import { theme } from '@/constants/theme';

type AppInputProps = Omit<TextInputProps, 'onChangeText' | 'style' | 'value'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
};

export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  editable = true,
  autoCapitalize = 'none',
  ...inputProps
}: AppInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = Boolean(secureTextEntry);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, error && styles.inputError, !editable && styles.inputDisabled]}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.disabled}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          selectionColor={theme.colors.deepGreen}
          style={styles.input}
          value={value}
          {...inputProps}
        />
        {isPasswordField ? (
          <TouchableOpacity
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            activeOpacity={0.7}
            disabled={!editable}
            hitSlop={8}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.visibilityButton}>
            <Ionicons
              color={theme.colors.mutedText}
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={21}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xxs,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  inputFrame: {
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.fontSize.md,
    minHeight: 54,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  visibilityButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
    width: 44,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    lineHeight: 17,
  },
});

export default AppInput;
