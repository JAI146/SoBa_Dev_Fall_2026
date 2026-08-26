import { ClientType, loginSchema } from '@purposemint/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { FormNotice } from '@/components/FormNotice';
import { theme } from '@/constants/theme';
import { useLoginMutation } from '@/hooks/use-auth-mutations';
import { useCooldown } from '@/hooks/use-cooldown';
import { ApiClientError } from '@/lib/api/client';
import { getApiFormErrors, getZodFieldErrors } from '@/lib/forms/errors';

type LoginField = 'email' | 'password';
type LoginErrors = Partial<Record<LoginField, string>>;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string>();
  const loginMutation = useLoginMutation();
  const cooldown = useCooldown();

  const handleLogin = () => {
    Keyboard.dismiss();
    setFormError(undefined);

    const result = loginSchema.safeParse({
      clientType: ClientType.MOBILE,
      email,
      password,
    });

    if (!result.success) {
      setErrors(getZodFieldErrors<LoginField>(result.error.issues));
      return;
    }

    setErrors({});
    loginMutation.mutate(result.data, {
      onError: (error) => {
        const nextErrors = getApiFormErrors(error, ['email', 'password']);
        setErrors(nextErrors.fieldErrors);
        setFormError(nextErrors.formError);
        if (error instanceof ApiClientError && error.status === 429) {
          cooldown.startCooldown(30);
        }
      },
    });
  };

  const isDisabled = loginMutation.isPending || cooldown.isCoolingDown;

  return (
    <AuthScaffold
      heroText="A calmer way to connect your everyday choices with what you value most."
      heroTitle="Build progress around what matters.">
      <View style={styles.headingBlock}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.supporting}>Continue building your goals, habits, and small wins.</Text>
      </View>

      <View style={styles.form}>
        <AppInput
          autoComplete="email"
          editable={!loginMutation.isPending}
          error={errors.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
            setFormError(undefined);
          }}
          placeholder="maya@example.com"
          returnKeyType="next"
          value={email}
        />
        <AppInput
          autoComplete="current-password"
          editable={!loginMutation.isPending}
          error={errors.password}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
            setFormError(undefined);
          }}
          onSubmitEditing={handleLogin}
          placeholder="Enter your password"
          returnKeyType="done"
          secureTextEntry
          value={password}
        />
        <View style={styles.accountLinks}>
          <TouchableOpacity
            accessibilityRole="link"
            activeOpacity={0.7}
            disabled={loginMutation.isPending}
            onPress={() => router.push('/(auth)/verify-email')}
            style={styles.forgotLink}>
            <Text style={styles.linkText}>Verify email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="link"
            activeOpacity={0.7}
            disabled={loginMutation.isPending}
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotLink}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FormNotice message={formError} />

      <AppButton
        disabled={isDisabled}
        loading={loginMutation.isPending}
        loadingTitle="Logging in…"
        onPress={handleLogin}
        title={cooldown.isCoolingDown ? `Try again in ${cooldown.secondsRemaining}s` : 'Log in'}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>New to PurposeMint?</Text>
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.7}
          disabled={loginMutation.isPending}
          onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
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
  accountLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    justifyContent: 'center',
    minHeight: 44,
  },
  linkText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'center',
  },
  switchText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
  },
});
