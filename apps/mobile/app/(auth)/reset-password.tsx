import { Ionicons } from '@expo/vector-icons';
import { resetPasswordSchema } from '@purposemint/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { FormNotice } from '@/components/FormNotice';
import { theme } from '@/constants/theme';
import { useResetPasswordMutation } from '@/hooks/use-auth-mutations';
import { useCooldown } from '@/hooks/use-cooldown';
import { ApiClientError } from '@/lib/api/client';
import { getApiFormErrors, getZodFieldErrors } from '@/lib/forms/errors';

type ResetPasswordField = 'email' | 'otp' | 'newPassword';
type ResetPasswordErrors = Partial<Record<ResetPasswordField, string>>;

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ confirmation?: string; email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [formError, setFormError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const resetPasswordMutation = useResetPasswordMutation();
  const cooldown = useCooldown();

  const handleReset = () => {
    Keyboard.dismiss();
    setFormError(undefined);

    const result = resetPasswordSchema.safeParse({ email, newPassword, otp });
    if (!result.success) {
      setErrors(getZodFieldErrors<ResetPasswordField>(result.error.issues));
      return;
    }

    setErrors({});
    resetPasswordMutation.mutate(result.data, {
      onError: (error) => {
        const nextErrors = getApiFormErrors(error, ['email', 'otp', 'newPassword']);
        setErrors(nextErrors.fieldErrors);
        setFormError(nextErrors.formError);
        if (error instanceof ApiClientError && error.status === 429) {
          cooldown.startCooldown(30);
        }
      },
      onSuccess: (response) => setSuccessMessage(response.message),
    });
  };

  const clearFieldError = (field: ResetPasswordField) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  if (successMessage) {
    return (
      <AuthScaffold
        heroText="A reset is simply another small step forward."
        heroTitle="You’re ready to keep going.">
        <View accessibilityLiveRegion="polite" style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons color={theme.colors.teal} name="checkmark" size={34} />
          </View>
          <Text style={styles.title}>Password updated</Text>
          <Text style={styles.supporting}>{successMessage}</Text>
          <AppButton
            onPress={() => router.replace('/(auth)/login')}
            style={styles.fullWidthButton}
            title="Log in"
          />
        </View>
      </AuthScaffold>
    );
  }

  const isDisabled = resetPasswordMutation.isPending || cooldown.isCoolingDown;

  return (
    <AuthScaffold
      heroText="Use the code from your email and choose a password that feels secure."
      heroTitle="One step back into your account.">
      <TouchableOpacity
        accessibilityLabel="Back"
        accessibilityRole="button"
        activeOpacity={0.7}
        disabled={resetPasswordMutation.isPending}
        onPress={() => router.back()}
        style={styles.backButton}>
        <Ionicons color={theme.colors.deepGreen} name="arrow-back" size={21} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.headingBlock}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.supporting}>
          Enter the six-digit code from your email and your new password.
        </Text>
      </View>

      <FormNotice message={params.confirmation} tone="neutral" />

      <View style={styles.form}>
        <AppInput
          autoComplete="email"
          editable={!resetPasswordMutation.isPending}
          error={errors.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            clearFieldError('email');
          }}
          placeholder="maya@example.com"
          value={email}
        />
        <AppInput
          autoComplete="one-time-code"
          editable={!resetPasswordMutation.isPending}
          error={errors.otp}
          inputMode="numeric"
          keyboardType="number-pad"
          label="Reset code"
          maxLength={6}
          onChangeText={(value) => {
            setOtp(value.replace(/\D/g, '').slice(0, 6));
            clearFieldError('otp');
          }}
          placeholder="000000"
          value={otp}
        />
        <AppInput
          autoComplete="new-password"
          editable={!resetPasswordMutation.isPending}
          error={errors.newPassword}
          label="New password"
          onChangeText={(value) => {
            setNewPassword(value);
            clearFieldError('newPassword');
          }}
          onSubmitEditing={handleReset}
          placeholder="At least 8 characters"
          returnKeyType="done"
          secureTextEntry
          value={newPassword}
        />
      </View>

      <FormNotice message={formError} />

      <AppButton
        disabled={isDisabled}
        loading={resetPasswordMutation.isPending}
        loadingTitle="Updating password…"
        onPress={handleReset}
        title={
          cooldown.isCoolingDown
            ? `Try again in ${cooldown.secondsRemaining}s`
            : 'Update password'
        }
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.xxs,
    minHeight: 44,
  },
  backText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  headingBlock: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  supporting: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
  },
  form: {
    gap: theme.spacing.md,
  },
  successCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    height: 68,
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
    width: 68,
  },
  fullWidthButton: {
    marginTop: theme.spacing.sm,
    width: '100%',
  },
});
