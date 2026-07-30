import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { theme } from '@/constants/theme';

type SignupErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSignup = () => {
    Keyboard.dismiss();
    const nextErrors: SignupErrors = {};

    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    else if (password.length < 6) nextErrors.password = 'Use at least 6 characters.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    if (!termsAccepted) nextErrors.terms = 'Please agree before continuing.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setTimeout(() => router.replace('/(tabs)'), 1200);
  };

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
          autoComplete="name"
          editable={!loading}
          error={errors.fullName}
          label="Full name"
          onChangeText={(value) => {
            setFullName(value);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
          placeholder="Maya Anderson"
          value={fullName}
        />
        <AppInput
          autoComplete="email"
          editable={!loading}
          error={errors.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          placeholder="maya@example.com"
          value={email}
        />
        <AppInput
          autoComplete="new-password"
          editable={!loading}
          error={errors.password}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          placeholder="At least 6 characters"
          secureTextEntry
          value={password}
        />
        <AppInput
          autoComplete="new-password"
          editable={!loading}
          error={errors.confirmPassword}
          label="Confirm password"
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({ ...current, confirmPassword: undefined }));
          }}
          onSubmitEditing={handleSignup}
          placeholder="Enter it again"
          secureTextEntry
          value={confirmPassword}
        />
        <View>
          <Pressable
            accessibilityLabel="I agree to the Terms and Privacy Policy"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted, disabled: loading }}
            disabled={loading}
            onPress={() => {
              setTermsAccepted((current) => !current);
              setErrors((current) => ({ ...current, terms: undefined }));
            }}
            style={styles.termsRow}>
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted ? <Ionicons color={theme.colors.white} name="checkmark" size={17} /> : null}
            </View>
            <Text style={styles.termsText}>I agree to the Terms and Privacy Policy</Text>
          </Pressable>
          {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}
        </View>
      </View>

      <AppButton
        loading={loading}
        loadingTitle="Creating account…"
        onPress={handleSignup}
        title="Create account"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Already have an account?</Text>
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.7}
          disabled={loading}
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
