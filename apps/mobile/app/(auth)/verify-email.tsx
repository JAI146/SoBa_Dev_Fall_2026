import { Ionicons } from '@expo/vector-icons';
import {
  ClientType,
  resendVerificationSchema,
  verifyEmailSchema,
} from '@purposemint/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { FormNotice } from '@/components/FormNotice';
import { theme } from '@/constants/theme';
import {
  useResendVerificationMutation,
  useVerifyEmailMutation,
} from '@/hooks/use-auth-mutations';
import { useCooldown } from '@/hooks/use-cooldown';
import { ApiClientError } from '@/lib/api/client';
import { getApiFormErrors, getZodFieldErrors } from '@/lib/forms/errors';

type VerifyField = 'email' | 'otp';
type VerifyErrors = Partial<Record<VerifyField, string>>;

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; message?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<VerifyErrors>({});
  const [formError, setFormError] = useState<string>();
  const [resendMessage, setResendMessage] = useState<string | undefined>(
    params.message,
  );
  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendVerificationMutation();
  const submitCooldown = useCooldown();
  const resendCooldown = useCooldown();

  const handleVerify = () => {
    Keyboard.dismiss();
    setFormError(undefined);

    const result = verifyEmailSchema.safeParse({
      clientType: ClientType.MOBILE,
      email,
      otp,
    });

    if (!result.success) {
      setErrors(getZodFieldErrors<VerifyField>(result.error.issues));
      return;
    }

    setErrors({});
    verifyMutation.mutate(result.data, {
      onError: (error) => {
        const nextErrors = getApiFormErrors(error, ['email', 'otp']);
        setErrors(nextErrors.fieldErrors);
        setFormError(nextErrors.formError);
        if (error instanceof ApiClientError && error.status === 429) {
          submitCooldown.startCooldown(30);
        }
      },
    });
  };

  const handleResend = () => {
    setFormError(undefined);
    setResendMessage(undefined);

    const result = resendVerificationSchema.safeParse({ email });
    if (!result.success) {
      setErrors((current) => ({
        ...current,
        email: getZodFieldErrors<'email'>(result.error.issues).email,
      }));
      return;
    }

    resendMutation.mutate(result.data, {
      onError: (error) => {
        const nextErrors = getApiFormErrors(error, ['email']);
        setErrors((current) => ({ ...current, email: nextErrors.fieldErrors.email }));
        setFormError(nextErrors.formError);
        if (error instanceof ApiClientError && error.status === 429) {
          resendCooldown.startCooldown(30);
        }
      },
      onSuccess: (response) => {
        setResendMessage(response.message);
        resendCooldown.startCooldown(60);
      },
    });
  };

  const clearFieldError = (field: VerifyField) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  const isVerifying = verifyMutation.isPending;
  const isResending = resendMutation.isPending;

  return (
    <AuthScaffold
      heroText="Confirming your email keeps your progress connected safely to you."
      heroTitle="A quick check, then you’re set.">
      <TouchableOpacity
        accessibilityLabel="Back to login"
        accessibilityRole="button"
        activeOpacity={0.7}
        disabled={isVerifying || isResending}
        onPress={() => router.replace('/(auth)/login')}
        style={styles.backButton}>
        <Ionicons color={theme.colors.deepGreen} name="arrow-back" size={21} />
        <Text style={styles.backText}>Back to login</Text>
      </TouchableOpacity>

      <View style={styles.headingBlock}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.supporting}>Enter the six-digit code we emailed you.</Text>
      </View>

      <View style={styles.form}>
        <AppInput
          autoComplete="email"
          editable={!isVerifying && !isResending}
          error={errors.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            setResendMessage(undefined);
            clearFieldError('email');
          }}
          placeholder="maya@example.com"
          value={email}
        />
        <AppInput
          autoComplete="one-time-code"
          editable={!isVerifying}
          error={errors.otp}
          inputMode="numeric"
          keyboardType="number-pad"
          label="Verification code"
          maxLength={6}
          onChangeText={(value) => {
            setOtp(value.replace(/\D/g, '').slice(0, 6));
            clearFieldError('otp');
          }}
          onSubmitEditing={handleVerify}
          placeholder="000000"
          returnKeyType="done"
          value={otp}
        />
      </View>

      <FormNotice message={resendMessage} tone="neutral" />
      <FormNotice message={formError} />

      <AppButton
        disabled={isVerifying || submitCooldown.isCoolingDown}
        loading={isVerifying}
        loadingTitle="Verifying…"
        onPress={handleVerify}
        title={
          submitCooldown.isCoolingDown
            ? `Try again in ${submitCooldown.secondsRemaining}s`
            : 'Verify email'
        }
      />

      <View style={styles.resendRow}>
        <Text style={styles.supporting}>Didn’t get the code?</Text>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.7}
          disabled={isResending || resendCooldown.isCoolingDown || isVerifying}
          onPress={handleResend}
          style={styles.resendButton}>
          <Text style={[styles.linkText, resendCooldown.isCoolingDown && styles.disabledLink]}>
            {isResending
              ? 'Sending…'
              : resendCooldown.isCoolingDown
                ? `Resend in ${resendCooldown.secondsRemaining}s`
                : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
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
  form: {
    gap: theme.spacing.md,
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'center',
  },
  resendButton: {
    justifyContent: 'center',
    minHeight: 44,
  },
  linkText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  disabledLink: {
    color: theme.colors.disabled,
  },
});
