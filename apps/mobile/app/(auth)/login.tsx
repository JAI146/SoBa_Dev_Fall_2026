import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { theme } from '@/constants/theme';

type LoginErrors = {
  email?: string;
  password?: string;
};

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    Keyboard.dismiss();
    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    setTimeout(() => router.replace('/(tabs)'), 1200);
  };

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
          editable={!loading}
          error={errors.email}
          keyboardType="email-address"
          label="Email address"
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          placeholder="maya@example.com"
          returnKeyType="next"
          value={email}
        />
        <AppInput
          autoComplete="current-password"
          editable={!loading}
          error={errors.password}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          onSubmitEditing={handleLogin}
          placeholder="Enter your password"
          returnKeyType="done"
          secureTextEntry
          value={password}
        />
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.7}
          disabled={loading}
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotLink}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <AppButton
        loading={loading}
        loadingTitle="Logging in…"
        onPress={handleLogin}
        title="Log in"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>New to PurposeMint?</Text>
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.7}
          disabled={loading}
          onPress={() => router.push('/(auth)/signup')}>
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
  forgotLink: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
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
