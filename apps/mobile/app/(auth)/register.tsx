import { Ionicons } from '@expo/vector-icons';
import { ClientType, registerSchema } from '@purposemint/contracts';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { FormNotice } from '@/components/FormNotice';
import { theme } from '@/constants/theme';
import { useRegisterMutation } from '@/hooks/use-auth-mutations';
import { useCooldown } from '@/hooks/use-cooldown';
import { ApiClientError } from '@/lib/api/client';
import { getApiFormErrors, getZodFieldErrors } from '@/lib/forms/errors';

type RegisterField = 'firstName' | 'lastName' | 'email' | 'password' | 'terms';
type RegisterErrors = Partial<Record<RegisterField, string>>;

const agreementAliases = {
  agreePrivacyPolicy: 'terms',
  agreeTermsOfUse: 'terms',
} as const;

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string>();
  const registerMutation = useRegisterMutation();
  const cooldown = useCooldown();

  const handleRegister = () => {
    Keyboard.dismiss();
    setFormError(undefined);

    const result = registerSchema.safeParse({
      agreePrivacyPolicy: policyAccepted,
      agreeTermsOfUse: policyAccepted,
      clientType: ClientType.MOBILE,
      email,
      firstName,
      lastName,
      password,
    });

    if (!result.success) {
      setErrors(getZodFieldErrors<RegisterField>(result.error.issues, agreementAliases));
      return;
    }

    setErrors({});
    registerMutation.mutate(result.data, {
      onError: (error) => {
        const nextErrors = getApiFormErrors(
          error,
          ['firstName', 'lastName', 'email', 'password', 'terms'],
          agreementAliases,
        );
        setErrors(nextErrors.fieldErrors);
        setFormError(nextErrors.formError);
        if (error instanceof ApiClientError && error.status === 429) {
          cooldown.startCooldown(30);
        }
      },
    });
  };

  const clearFieldError = (field: RegisterField) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  const isDisabled = registerMutation.isPending || cooldown.isCoolingDown;

  return (
    <AuthScaffold
      heroText="Begin with one realistic goal, then let your confidence grow from there."
      heroTitle="A fresh start, at your pace.">
      <View style={styles.headingBlock}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.supporting}>Start with one goal and build from there.</Text>
      </View>

      <View style={styles.form}>
        <AppInput
          autoCapitalize="words"
          autoComplete="given-name"
          editable={!registerMutation.isPending}
          error={errors.firstName}
          label="First name"
          onChangeText={(value) => {
            setFirstName(value);
            clearFieldError('firstName');
          }}
          placeholder="Maya"
          value={firstName}
        />
        <AppInput
          autoCapitalize="words"
          autoComplete="family-name"
          editable={!registerMutation.isPending}
          error={errors.lastName}
          label="Last name"
          onChangeText={(value) => {
            setLastName(value);
            clearFieldError('lastName');
          }}
          placeholder="Anderson"
          value={lastName}
        />
        <AppInput
          autoComplete="email"
          editable={!registerMutation.isPending}
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
          autoComplete="new-password"
          editable={!registerMutation.isPending}
          error={errors.password}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            clearFieldError('password');
          }}
          onSubmitEditing={handleRegister}
          placeholder="At least 8 characters"
          secureTextEntry
          value={password}
        />
        <View>
          <Pressable
            accessibilityLabel="I agree to the Terms of Use and Privacy Policy"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: policyAccepted, disabled: registerMutation.isPending }}
            disabled={registerMutation.isPending}
            onPress={() => {
              setPolicyAccepted((current) => !current);
              clearFieldError('terms');
            }}
            style={styles.termsRow}>
            <View style={[styles.checkbox, policyAccepted && styles.checkboxChecked]}>
              {policyAccepted ? (
                <Ionicons color={theme.colors.white} name="checkmark" size={17} />
              ) : null}
            </View>
            <Text style={styles.termsText}>I agree to the Terms of Use and Privacy Policy</Text>
          </Pressable>
          {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}
        </View>
      </View>

      <FormNotice message={formError} />

      <AppButton
        disabled={isDisabled}
        loading={registerMutation.isPending}
        loadingTitle="Creating account…"
        onPress={handleRegister}
        title={
          cooldown.isCoolingDown
            ? `Try again in ${cooldown.secondsRemaining}s`
            : 'Create account'
        }
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Already have an account?</Text>
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.7}
          disabled={registerMutation.isPending}
          onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.linkText}>Back to login</Text>
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
  termsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 44,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.disabled,
    borderRadius: 7,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  termsText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  termsError: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    marginTop: theme.spacing.xxs,
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
  linkText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
});
