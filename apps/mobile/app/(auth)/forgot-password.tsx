import { Ionicons } from '@expo/vector-icons';
import { forgotPasswordSchema } from '@purposemint/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { FormNotice } from '@/components/FormNotice';
import { theme } from '@/constants/theme';
import { useForgotPasswordMutation } from '@/hooks/use-auth-mutations';
import { useCooldown } from '@/hooks/use-cooldown';
import { ApiClientError } from '@/lib/api/client';
import { getApiFormErrors, getZodFieldErrors } from '@/lib/forms/errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const cooldown = useCooldown();

  const handleSubmit = () => {
    Keyboard.dismiss();
    setFormError(undefined);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(getZodFieldErrors<'email'>(result.error.issues).email);
      return;
    }

    setEmailError(undefined);
    forgotPasswordMutation.mutate(result.data, {
      onError: (error) => {
        const nextErrors = getApiFormErrors(error, ['email']);
        setEmailError(nextErrors.fieldErrors.email);
        setFormError(nextErrors.formError);
        if (error instanceof ApiClientError && error.status === 429) {
          cooldown.startCooldown(30);
        }
      },
      onSuccess: (response) => {
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { confirmation: response.message, email: result.data.email },
        });
      },
    });
  };

  const isDisabled = forgotPasswordMutation.isPending || cooldown.isCoolingDown;

  return (
    <AuthScaffold
      heroText="A reset is simply another small step forward."
      heroTitle="Let’s get you back on track.">
      <TouchableOpacity
        accessibilityLabel="Back to login"
        accessibilityRole="button"
        activeOpacity={0.7}
        disabled={forgotPasswordMutation.isPending}
        onPress={() => router.back()}
        style={styles.backButton}>
        <Ionicons color={theme.colors.deepGreen} name="arrow-back" size={21} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.headingBlock}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.supporting}>
          Enter your email and we’ll send a six-digit reset code.
        </Text>
      </View>

      <AppInput
        autoComplete="email"
        editable={!forgotPasswordMutation.isPending}
        error={emailError}
        keyboardType="email-address"
        label="Email address"
        onChangeText={(value) => {
          setEmail(value);
          setEmailError(undefined);
          setFormError(undefined);
        }}
        onSubmitEditing={handleSubmit}
        placeholder="maya@example.com"
        returnKeyType="send"
        value={email}
      />

      <FormNotice message={formError} />

      <AppButton
        disabled={isDisabled}
        loading={forgotPasswordMutation.isPending}
        loadingTitle="Sending code…"
        onPress={handleSubmit}
        title={cooldown.isCoolingDown ? `Try again in ${cooldown.secondsRemaining}s` : 'Send code'}
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
  },
  supporting: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
  },
});
