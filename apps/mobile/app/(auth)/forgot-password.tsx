import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AuthScaffold } from '@/components/AuthScaffold';
import { theme } from '@/constants/theme';

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendResetLink = () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(undefined);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  };

  return (
    <AuthScaffold
      heroText="A reset is simply another small step forward."
      heroTitle="Let’s get you back on track.">
      <TouchableOpacity
        accessibilityLabel="Back to login"
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={() => router.back()}
        style={styles.backButton}>
        <Ionicons color={theme.colors.deepGreen} name="arrow-back" size={21} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {sent ? (
        <View accessibilityLiveRegion="polite" style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons color={theme.colors.deepGreen} name="mail-open-outline" size={32} />
          </View>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.supporting}>
            We sent a demo reset link to the email address you entered.
          </Text>
          <AppButton
            onPress={() => router.replace('/(auth)/login')}
            style={styles.successButton}
            title="Back to login"
            variant="soft"
          />
        </View>
      ) : (
        <>
          <View style={styles.headingBlock}>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.supporting}>Enter your email and we’ll send you a reset link.</Text>
          </View>
          <AppInput
            autoComplete="email"
            editable={!loading}
            error={error}
            keyboardType="email-address"
            label="Email address"
            onChangeText={(value) => {
              setEmail(value);
              setError(undefined);
            }}
            onSubmitEditing={sendResetLink}
            placeholder="maya@example.com"
            returnKeyType="send"
            value={email}
          />
          <AppButton
            loading={loading}
            loadingTitle="Sending link…"
            onPress={sendResetLink}
            title="Send reset link"
          />
        </>
      )}
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
  successCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    height: 68,
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
    width: 68,
  },
  successButton: {
    marginTop: theme.spacing.sm,
    width: '100%',
  },
});
