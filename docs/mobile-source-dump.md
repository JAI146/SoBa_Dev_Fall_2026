# PurposeMint Demo — Mobile Source Dump

Generated 2026-07-30T12:27:35.918Z
Files: 37

> Source of the SDK 54 Expo Go demo. To be ported into the monorepo
> at `apps/mobile`. Assets are NOT included here — copy them by hand.

## Contents

- `app.json`
- `app/_layout.tsx`
- `app/(auth)/_layout.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/goals.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/journal.tsx`
- `app/(tabs)/profile.tsx`
- `app/index.tsx`
- `components/AppButton.tsx`
- `components/AppInput.tsx`
- `components/AppScreen.tsx`
- `components/AuthScaffold.tsx`
- `components/DecorativeBlob.tsx`
- `components/external-link.tsx`
- `components/haptic-tab.tsx`
- `components/hello-wave.tsx`
- `components/parallax-scroll-view.tsx`
- `components/ProgressBar.tsx`
- `components/PurposeMintLogo.tsx`
- `components/SectionHeader.tsx`
- `components/SmallWinItem.tsx`
- `components/themed-text.tsx`
- `components/themed-view.tsx`
- `components/ui/collapsible.tsx`
- `components/ui/icon-symbol.ios.tsx`
- `components/ui/icon-symbol.tsx`
- `constants/theme.ts`
- `eas.json`
- `eslint.config.js`
- `hooks/use-color-scheme.ts`
- `hooks/use-color-scheme.web.ts`
- `hooks/use-theme-color.ts`
- `tsconfig.json`

---

## `app.json`

```json
{
  "expo": {
    "name": "PurposeMint",
    "slug": "react-native-expo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "reactnativeexpo",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.saadsohail.dev.reactnativeexpo"
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/purposemint-logo.png",
          "imageWidth": 280,
          "resizeMode": "contain",
          "backgroundColor": "#FFFBFD",
          "dark": {
            "backgroundColor": "#FFFBFD"
          }
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "5d57f4a9-6f60-4ce1-84a9-1623600931d0"
      }
    }
  }
}
```

---

## `app/_layout.tsx`

```typescript
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar backgroundColor="transparent" style="dark" translucent />
    </>
  );
}
```

---

## `app/(auth)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ animation: 'slide_from_right', headerShown: false }} />;
}
```

---

## `app/(auth)/forgot-password.tsx`

```typescript
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
```

---

## `app/(auth)/login.tsx`

```typescript
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
```

---

## `app/(auth)/signup.tsx`

```typescript
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
```

---

## `app/(tabs)/_layout.tsx`

```typescript
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ color, focused, name }: { color: string; focused: boolean; name: IoniconName }) {
  return <Ionicons color={color} name={focused ? name : (`${name}-outline` as IoniconName)} size={23} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.deepGreen,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'ios' ? 86 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="home" />,
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          tabBarAccessibilityLabel: 'Goals tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="flag" />,
          title: 'Goals',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          tabBarAccessibilityLabel: 'Journal tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="book" />,
          title: 'Journal',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="person" />,
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
```

---

## `app/(tabs)/goals.tsx`

```typescript
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { ProgressBar } from '@/components/ProgressBar';
import { theme } from '@/constants/theme';

export default function GoalsScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>YOUR NEXT CHAPTER</Text>
        <Text style={styles.title}>Your goals</Text>
        <Text style={styles.subtitle}>Realistic targets, connected to the life you want to build.</Text>
      </View>

      <View style={styles.goalCard}>
        <View style={styles.goalTopRow}>
          <View style={styles.goalIcon}>
            <Ionicons color={theme.colors.deepGreen} name="umbrella-outline" size={26} />
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>
        <Text style={styles.goalTitle}>Emergency cushion</Text>
        <Text style={styles.goalDescription}>A little space for the moments you can’t plan for.</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>$340</Text>
          <Text style={styles.target}>of $500</Text>
        </View>
        <ProgressBar progress={0.68} />
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons color={theme.colors.mutedText} name="calendar-outline" size={16} />
            <Text style={styles.metaText}>8 weeks left</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons color={theme.colors.mutedText} name="heart-outline" size={16} />
            <Text style={styles.metaText}>Security</Text>
          </View>
        </View>
      </View>

      <View style={styles.upcomingCard}>
        <View style={styles.upcomingIcon}>
          <Ionicons color={theme.colors.coral} name="sparkles-outline" size={25} />
        </View>
        <View style={styles.upcomingCopy}>
          <Text style={styles.upcomingTitle}>More goal tools are growing</Text>
          <Text style={styles.upcomingText}>
            Soon you’ll be able to add milestones, connect habits, and celebrate each micro-win.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  eyebrow: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.xs,
    maxWidth: 330,
  },
  goalCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  goalTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  activePill: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  activeText: {
    color: theme.colors.deepGreen,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: theme.spacing.lg,
  },
  goalDescription: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.xs,
  },
  amountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  amount: {
    color: theme.colors.deepGreen,
    fontSize: 28,
    fontWeight: '900',
  },
  target: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xxs,
  },
  metaText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  upcomingCard: {
    backgroundColor: theme.colors.lightCoral,
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  upcomingIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  upcomingCopy: {
    flex: 1,
  },
  upcomingTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  upcomingText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
});
```

---

## `app/(tabs)/index.tsx`

```typescript
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { DecorativeBlob } from '@/components/DecorativeBlob';
import { ProgressBar } from '@/components/ProgressBar';
import { SectionHeader } from '@/components/SectionHeader';
import { SmallWinItem } from '@/components/SmallWinItem';
import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const smallWins: { id: string; title: string; time: string; icon: IoniconName }[] = [
  { id: 'save', title: 'Move $5 to your cushion', time: '2 min', icon: 'wallet-outline' },
  { id: 'review', title: 'Review one spending choice', time: '3 min', icon: 'search-outline' },
  { id: 'reflect', title: 'Write today’s reflection', time: '2 min', icon: 'pencil-outline' },
];

const moods = ['😔', '😕', '😌', '🙂', '🌟'];
const week = [
  { day: 'M', done: true },
  { day: 'T', done: true },
  { day: 'W', done: true },
  { day: 'T', done: true },
  { day: 'F', done: false },
  { day: 'S', done: false },
  { day: 'S', done: false },
];

export default function HomeScreen() {
  const [completedWins, setCompletedWins] = useState<Record<string, boolean>>({});
  const [selectedMood, setSelectedMood] = useState<string>();
  const [notificationSeen, setNotificationSeen] = useState(false);

  const toggleWin = (id: string) => {
    setCompletedWins((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>Good morning, Maya</Text>
          <Text style={styles.headerMessage}>Every small step is building something meaningful.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => setNotificationSeen(true)}
            style={styles.headerButton}>
            <Ionicons color={theme.colors.deepGreen} name="notifications-outline" size={22} />
            {!notificationSeen ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Open Maya's profile"
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}>
            <Text style={styles.avatarText}>MA</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroCard}>
        <DecorativeBlob style={styles.heroMintBlob} />
        <DecorativeBlob style={styles.heroCoralBlob} />
        <DecorativeBlob style={styles.heroOutlineBlob} />
        <View style={styles.heroContent}>
          <Text style={styles.eyebrow}>THIS WEEK’S PURPOSE</Text>
          <Text style={styles.heroTitle}>Build a little more breathing room</Text>
          <Text style={styles.heroText}>You’re making progress toward your emergency cushion.</Text>
          <View style={styles.progressCopy}>
            <Text style={styles.progressAmount}>$340 of $500</Text>
            <Text style={styles.progressPercent}>68%</Text>
          </View>
          <ProgressBar
            fillStyle={styles.heroProgressFill}
            progress={0.68}
            trackStyle={styles.heroProgressTrack}
          />
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/goals')}
            style={styles.heroButton}>
            <Text style={styles.heroButtonText}>View goal</Text>
            <Ionicons color={theme.colors.deepGreen} name="arrow-forward" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader detail="3 actions" title="Today’s small wins" />
        <View style={styles.list}>
          {smallWins.map((win) => (
            <SmallWinItem
              completed={Boolean(completedWins[win.id])}
              icon={win.icon}
              key={win.id}
              onToggle={() => toggleWin(win.id)}
              time={win.time}
              title={win.title}
            />
          ))}
        </View>
      </View>

      <View style={styles.purposeCard}>
        <View style={styles.purposeIcon}>
          <Ionicons color={theme.colors.deepGreen} name="git-network-outline" size={24} />
        </View>
        <Text style={styles.cardTitle}>Your PurposeMap</Text>
        <View style={styles.chipsWrap}>
          <View style={styles.connector} />
          {['Security', 'Family', 'Freedom'].map((value, index) => (
            <View key={value} style={[styles.valueChip, index === 1 && styles.familyChip]}>
              <Text style={styles.valueText}>{value}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardBody}>
          Your current goals are connected to the values that matter most to you.
        </Text>
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/goals')}
          style={styles.textLink}>
          <Text style={styles.textLinkLabel}>Explore PurposeMap</Text>
          <Ionicons color={theme.colors.deepGreen} name="arrow-forward" size={17} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekCard}>
        <View style={styles.weekTitleRow}>
          <View>
            <Text style={styles.cardTitle}>Weekly rhythm</Text>
            <Text style={styles.streak}>4-day streak</Text>
          </View>
          <View style={styles.flameIcon}>
            <Ionicons color={theme.colors.coral} name="flame" size={25} />
          </View>
        </View>
        <View style={styles.daysRow}>
          {week.map((item, index) => (
            <View key={`${item.day}-${index}`} style={styles.dayColumn}>
              <View style={[styles.dayDot, item.done && styles.dayDotDone]}>
                {item.done ? (
                  <Ionicons color={theme.colors.white} name="checkmark" size={16} />
                ) : (
                  <View style={styles.dayEmpty} />
                )}
              </View>
              <Text style={styles.dayText}>{item.day}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.weekMessage}>Consistency matters more than perfection.</Text>
      </View>

      <View style={styles.reflectionCard}>
        <View style={styles.reflectionHeading}>
          <View style={styles.reflectionIcon}>
            <Ionicons color={theme.colors.deepGreen} name="heart-outline" size={22} />
          </View>
          <Text style={styles.cardTitle}>How are you feeling today?</Text>
        </View>
        <View style={styles.moodRow}>
          {moods.map((mood) => {
            const isSelected = selectedMood === mood;
            return (
              <Pressable
                accessibilityLabel={`Select mood ${mood}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={mood}
                onPress={() => setSelectedMood(mood)}
                style={[styles.moodButton, isSelected && styles.moodButtonSelected]}>
                <Text style={styles.mood}>{mood}</Text>
              </Pressable>
            );
          })}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={() => router.push('/(tabs)/journal')}
          style={styles.reflectionButton}>
          <Text style={styles.reflectionButtonText}>Add reflection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.badgeCard}>
        <View style={styles.badgeVisual}>
          <View style={styles.badgeInner}>
            <Ionicons color={theme.colors.deepGreen} name="sparkles" size={25} />
          </View>
        </View>
        <View style={styles.badgeCopy}>
          <Text style={styles.badgeEyebrow}>ALMOST YOURS</Text>
          <Text style={styles.badgeTitle}>Small Wins Starter</Text>
          <Text style={styles.badgeBody}>Complete one more action to unlock this badge.</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  greeting: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  headerMessage: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.xxs,
    maxWidth: 280,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  notificationDot: {
    backgroundColor: theme.colors.coral,
    borderColor: theme.colors.white,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 9,
    top: 8,
    width: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.xl,
    minHeight: 370,
    overflow: 'hidden',
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  heroContent: {
    flex: 1,
    maxWidth: 330,
    zIndex: 1,
  },
  eyebrow: {
    color: theme.colors.mint,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 38,
    marginTop: theme.spacing.sm,
    maxWidth: 300,
  },
  heroText: {
    color: '#D9ECE7',
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    maxWidth: 280,
  },
  progressCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  progressAmount: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  progressPercent: {
    color: theme.colors.mint,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroProgressTrack: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroProgressFill: {
    backgroundColor: theme.colors.mint,
  },
  heroButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 50,
    paddingHorizontal: theme.spacing.lg,
  },
  heroButtonText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroMintBlob: {
    backgroundColor: 'rgba(158,223,203,0.22)',
    height: 230,
    right: -84,
    top: -48,
    width: 230,
  },
  heroCoralBlob: {
    backgroundColor: theme.colors.coral,
    bottom: -52,
    height: 150,
    opacity: 0.9,
    right: -24,
    width: 150,
  },
  heroOutlineBlob: {
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 24,
    bottom: -60,
    height: 190,
    left: -92,
    width: 190,
  },
  section: {
    gap: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.sm,
  },
  purposeCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  purposeIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 48,
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    width: 48,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  chipsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.lg,
    position: 'relative',
  },
  connector: {
    backgroundColor: theme.colors.mint,
    height: 2,
    left: '12%',
    position: 'absolute',
    right: '12%',
    top: 20,
  },
  valueChip: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.mint,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm,
    zIndex: 1,
  },
  familyChip: {
    backgroundColor: theme.colors.lightCoral,
    borderColor: theme.colors.coral,
  },
  valueText: {
    color: theme.colors.darkGreenText,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  cardBody: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
  },
  textLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    minHeight: 44,
  },
  textLinkLabel: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  weekCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  weekTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streak: {
    color: theme.colors.coral,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
    marginTop: theme.spacing.xxs,
  },
  flameIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightCoral,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  dayColumn: {
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  dayDot: {
    alignItems: 'center',
    backgroundColor: theme.colors.graphite,
    borderRadius: theme.radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dayDotDone: {
    backgroundColor: theme.colors.deepGreen,
  },
  dayEmpty: {
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  dayText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  weekMessage: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  reflectionCard: {
    backgroundColor: theme.colors.lavender,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  reflectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  reflectionIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.lg,
  },
  moodButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'transparent',
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  moodButtonSelected: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.deepGreen,
  },
  mood: {
    fontSize: 23,
  },
  reflectionButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    minHeight: 50,
  },
  reflectionButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  badgeCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  badgeVisual: {
    alignItems: 'center',
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  badgeInner: {
    alignItems: 'center',
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  badgeCopy: {
    flex: 1,
  },
  badgeEyebrow: {
    color: '#826314',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  badgeTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
    marginTop: 3,
  },
  badgeBody: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});
```

---

## `app/(tabs)/journal.tsx`

```typescript
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { theme } from '@/constants/theme';

export default function JournalScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>A MOMENT FOR YOU</Text>
        <Text style={styles.title}>Reflections</Text>
        <Text style={styles.subtitle}>Notice what’s working, without judging what isn’t.</Text>
      </View>

      <View style={styles.promptCard}>
        <View style={styles.promptTopRow}>
          <View style={styles.promptIcon}>
            <Ionicons color={theme.colors.deepGreen} name="chatbubble-ellipses-outline" size={26} />
          </View>
          <Text style={styles.promptLabel}>TODAY’S PROMPT</Text>
        </View>
        <Text style={styles.prompt}>What small choice made you feel more secure today?</Text>
        <View style={styles.promptHint}>
          <Ionicons color={theme.colors.mutedText} name="time-outline" size={17} />
          <Text style={styles.promptHintText}>Take two quiet minutes</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>A recent reflection</Text>
        <Text style={styles.date}>Yesterday</Text>
      </View>

      <View style={styles.previousCard}>
        <View style={styles.moodBadge}>
          <Text style={styles.mood}>🙂</Text>
        </View>
        <Text style={styles.previousText}>
          I paused before ordering takeout and made something simple at home. It felt good to choose my cushion goal without feeling deprived.
        </Text>
        <View style={styles.valueTag}>
          <Ionicons color={theme.colors.deepGreen} name="shield-checkmark-outline" size={15} />
          <Text style={styles.valueTagText}>Connected to Security</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  eyebrow: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.xs,
  },
  promptCard: {
    backgroundColor: theme.colors.lavender,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  promptTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  promptIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  promptLabel: {
    color: theme.colors.deepGreen,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  prompt: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: theme.spacing.lg,
  },
  promptHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  promptHintText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  date: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  previousCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    marginTop: -theme.spacing.md,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  moodBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  mood: {
    fontSize: 23,
  },
  previousText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 25,
    marginTop: theme.spacing.md,
  },
  valueTag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xxs,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  valueTagText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
});
```

---

## `app/(tabs)/profile.tsx`

```typescript
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { PurposeMintLogo } from '@/components/PurposeMintLogo';
import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const settings: { icon: IoniconName; label: string; value: string }[] = [
  { icon: 'person-outline', label: 'Personal details', value: 'Maya Anderson' },
  { icon: 'notifications-outline', label: 'Reminders', value: 'Gentle nudges on' },
  { icon: 'shield-checkmark-outline', label: 'Privacy', value: 'Review settings' },
  { icon: 'help-circle-outline', label: 'Support', value: 'How can we help?' },
];

export default function ProfileScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.logoWrap}>
          <PurposeMintLogo size={44} />
        </View>
        <Text style={styles.name}>Maya Anderson</Text>
        <View style={styles.planPill}>
          <Text style={styles.planText}>Free plan</Text>
        </View>
        <Text style={styles.profileMessage}>Your progress belongs to you. Keep going at your own pace.</Text>
      </View>

      <View style={styles.settingsCard}>
        {settings.map((setting, index) => (
          <View
            key={setting.label}
            style={[styles.settingRow, index < settings.length - 1 && styles.settingDivider]}>
            <View style={styles.settingIcon}>
              <Ionicons color={theme.colors.deepGreen} name={setting.icon} size={21} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>{setting.label}</Text>
              <Text style={styles.settingValue}>{setting.value}</Text>
            </View>
            <Ionicons color={theme.colors.disabled} name="chevron-forward" size={19} />
          </View>
        ))}
      </View>

      <AppButton
        accessibilityLabel="Log out of PurposeMint"
        onPress={() => router.replace('/(auth)/login')}
        title="Log out"
        variant="outline"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
  },
  logoWrap: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    height: 84,
    justifyContent: 'center',
    width: 210,
    ...theme.shadows.card,
  },
  name: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: theme.spacing.md,
  },
  planPill: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  planText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  profileMessage: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.md,
    maxWidth: 300,
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 76,
  },
  settingDivider: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  settingIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  settingCopy: {
    flex: 1,
  },
  settingLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  settingValue: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    marginTop: 3,
  },
});
```

---

## `app/index.tsx`

```typescript
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DecorativeBlob } from '@/components/DecorativeBlob';
import { PurposeMintLogo } from '@/components/PurposeMintLogo';
import { theme } from '@/constants/theme';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBlob style={styles.topBlob} />
      <DecorativeBlob style={styles.bottomBlob} />
      <View style={styles.content}>
        <View style={styles.logoHalo}>
          <PurposeMintLogo size={70} />
        </View>
        <Text style={styles.tagline}>Small steps. Meaningful progress.</Text>
        <ActivityIndicator color={theme.colors.deepGreen} size="small" style={styles.loader} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.cream,
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  logoHalo: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    height: 142,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
    ...theme.shadows.card,
  },
  tagline: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  topBlob: {
    backgroundColor: theme.colors.lightMint,
    height: 220,
    right: -96,
    top: -72,
    width: 220,
  },
  bottomBlob: {
    backgroundColor: theme.colors.lavender,
    bottom: -110,
    height: 260,
    left: -110,
    width: 260,
  },
});
```

---

## `components/AppButton.tsx`

```typescript
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
```

---

## `components/AppInput.tsx`

```typescript
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
```

---

## `components/AppScreen.tsx`

```typescript
import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type AppScreenProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, contentContainerStyle }: AppScreenProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.cream,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: 112,
  },
});
```

---

## `components/AuthScaffold.tsx`

```typescript
import { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

import { DecorativeBlob } from './DecorativeBlob';
import { PurposeMintLogo } from './PurposeMintLogo';

type AuthScaffoldProps = PropsWithChildren<{
  heroTitle: string;
  heroText: string;
}>;

export function AuthScaffold({ children, heroTitle, heroText }: AuthScaffoldProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <DecorativeBlob style={styles.mintBlob} />
            <DecorativeBlob style={styles.coralBlob} />
            <DecorativeBlob style={styles.lavenderBlob} />
            <PurposeMintLogo />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{heroTitle}</Text>
              <Text style={styles.heroText}>{heroText}</Text>
            </View>
          </View>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.lightMint,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    backgroundColor: theme.colors.cream,
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    backgroundColor: theme.colors.lightMint,
    minHeight: 340,
    overflow: 'hidden',
    paddingBottom: 88,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  heroCopy: {
    maxWidth: 330,
    paddingTop: theme.spacing.xl,
  },
  heroTitle: {
    color: theme.colors.darkGreenText,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 41,
  },
  heroText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.sm,
    maxWidth: 300,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: -44,
    maxWidth: 520,
    padding: theme.spacing.lg,
    width: '90%',
    ...theme.shadows.card,
  },
  mintBlob: {
    backgroundColor: 'rgba(194, 10, 114, 0.12)',
    height: 190,
    right: -50,
    top: 54,
    transform: [{ rotate: '-18deg' }],
    width: 120,
  },
  coralBlob: {
    backgroundColor: 'rgba(243, 207, 24, 0.30)',
    height: 86,
    right: 42,
    top: -34,
    width: 86,
  },
  lavenderBlob: {
    backgroundColor: 'rgba(87, 16, 111, 0.10)',
    bottom: -42,
    height: 120,
    left: -34,
    width: 120,
  },
});
```

---

## `components/DecorativeBlob.tsx`

```typescript
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type DecorativeBlobProps = {
  style?: StyleProp<ViewStyle>;
};

export function DecorativeBlob({ style }: DecorativeBlobProps) {
  return <View pointerEvents="none" style={[styles.blob, style]} />;
}

const styles = StyleSheet.create({
  blob: {
    borderRadius: 999,
    position: 'absolute',
  },
});
```

---

## `components/external-link.tsx`

```typescript
import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
```

---

## `components/haptic-tab.tsx`

```typescript
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
```

---

## `components/hello-wave.tsx`

```typescript
import Animated from 'react-native-reanimated';

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}
```

---

## `components/parallax-scroll-view.tsx`

```typescript
import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}>
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme] },
          headerAnimatedStyle,
        ]}>
        {headerImage}
      </Animated.View>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
```

---

## `components/ProgressBar.tsx`

```typescript
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type ProgressBarProps = {
  progress: number;
  trackStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
};

export function ProgressBar({ progress, trackStyle, fillStyle }: ProgressBarProps) {
  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const fillWidth = `${normalizedProgress * 100}%` as `${number}%`;

  return (
    <View
      accessibilityLabel={`${Math.round(normalizedProgress * 100)} percent complete`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(normalizedProgress * 100) }}
      style={[styles.track, trackStyle]}>
      <View style={[styles.fill, { width: fillWidth }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    height: 9,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.pill,
    height: '100%',
  },
});
```

---

## `components/PurposeMintLogo.tsx`

```typescript
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

type PurposeMintLogoProps = {
  size?: number;
  showName?: boolean;
  inverted?: boolean;
};

export function PurposeMintLogo({
  size = 52,
  showName: _showName = true,
  inverted = false,
}: PurposeMintLogoProps) {
  const logoWidth = size * 3.72;

  return (
    <View
      accessibilityLabel="PurposeMint"
      accessibilityRole="image"
      style={styles.lockup}
    >
      <Image
        contentFit="contain"
        source={require("../assets/images/purposemint-logo.png")}
        style={[
          styles.image,
          { height: size, opacity: inverted ? 0.96 : 1, width: logoWidth },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: "center",
    flexDirection: "row",
  },
  image: {
    maxWidth: "100%",
  },
});
```

---

## `components/SectionHeader.tsx`

```typescript
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type SectionHeaderProps = {
  title: string;
  detail?: string;
};

export function SectionHeader({ title, detail }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  detail: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
});
```

---

## `components/SmallWinItem.tsx`

```typescript
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

type SmallWinItemProps = {
  title: string;
  time: string;
  icon: IoniconName;
  completed: boolean;
  onToggle: () => void;
};

export function SmallWinItem({
  title,
  time,
  icon,
  completed,
  onToggle,
}: SmallWinItemProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={`${completed ? 'Completed' : 'Mark complete'}: ${title}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      activeOpacity={0.76}
      onPress={onToggle}
      style={[styles.card, completed && styles.cardCompleted]}>
      <View style={[styles.check, completed && styles.checkCompleted]}>
        {completed ? <Ionicons color={theme.colors.white} name="checkmark" size={18} /> : null}
      </View>
      <View style={[styles.icon, completed && styles.iconCompleted]}>
        <Ionicons color={theme.colors.deepGreen} name={icon} size={20} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, completed && styles.titleCompleted]}>{title}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Ionicons color={theme.colors.disabled} name="chevron-forward" size={19} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 76,
    padding: theme.spacing.sm,
  },
  cardCompleted: {
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.mint,
  },
  check: {
    alignItems: 'center',
    borderColor: theme.colors.disabled,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  checkCompleted: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconCompleted: {
    backgroundColor: theme.colors.white,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
    lineHeight: 20,
  },
  titleCompleted: {
    color: theme.colors.deepGreen,
  },
  time: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    marginTop: 3,
  },
});
```

---

## `components/themed-text.tsx`

```typescript
import { StyleSheet, Text, type TextProps } from 'react-native';

import { theme } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: theme.colors.teal,
  },
});
```

---

## `components/themed-view.tsx`

```typescript
import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
```

---

## `components/ui/collapsible.tsx`

```typescript
import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
```

---

## `components/ui/icon-symbol.ios.tsx`

```typescript
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
```

---

## `components/ui/icon-symbol.tsx`

```typescript
// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
```

---

## `constants/theme.ts`

```typescript
import { Platform } from 'react-native';

export const theme = {
  colors: {
    deepGreen: '#C20A72',
    deepGreenPressed: '#9F075D',
    darkGreenText: '#26160F',
    mint: '#087A8C',
    mintDark: '#006879',
    lightMint: '#FFF0F7',
    cream: '#FFFBFD',
    lavender: '#F6EFF8',
    coral: '#F3CF18',
    lightCoral: '#FFF8CD',
    white: '#FFFFFF',
    text: '#2B1A15',
    mutedText: '#75666F',
    border: '#EFDFE8',
    disabled: '#B9AAB2',
    danger: '#A90855',
    gold: '#F3CF18',
    paleGold: '#FFF8CD',
    tabInactive: '#927F8A',
    plum: '#57106F',
    teal: '#087A8C',

    // Backward-compatible aliases for the starter components that remain in the project.
    primary: '#C20A72',
    primaryDark: '#9F075D',
    primarySoft: '#FFF0F7',
    accent: '#087A8C',
    accentDark: '#006879',
    accentSoft: '#E8F6F7',
    background: '#FFFBFD',
    backgroundSoft: '#F6EFF8',
    card: '#FFFFFF',
    cardAlt: '#FFF0F7',
    success: '#087A8C',
    inputBackground: '#FFFCFE',
    chip: '#FAF2F7',
    ink: '#26160F',
    graphite: '#F8F3F6',
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 40,
    xxxl: 52,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 26,
    xxl: 32,
    pill: 999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 38,
  },
  shadows: {
    card:
      Platform.select({
        ios: {
          shadowColor: '#57106F',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.09,
          shadowRadius: 20,
        },
        android: {
          elevation: 4,
        },
        default: {
          shadowColor: '#57106F',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        },
      }) ?? {},
    button:
      Platform.select({
        ios: {
          shadowColor: '#C20A72',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
        },
        android: {
          elevation: 3,
        },
        default: {
          shadowColor: '#C20A72',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
      }) ?? {},
  },
};

export type AppTheme = typeof theme;

export const Colors = {
  light: {
    text: theme.colors.text,
    background: theme.colors.cream,
    tint: theme.colors.deepGreen,
    icon: theme.colors.mutedText,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.deepGreen,
  },
  dark: {
    text: theme.colors.text,
    background: theme.colors.cream,
    tint: theme.colors.deepGreen,
    icon: theme.colors.mutedText,
    tabIconDefault: theme.colors.tabInactive,
    tabIconSelected: theme.colors.deepGreen,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
```

---

## `eas.json`

```json
{
  "cli": {
    "version": ">= 21.0.1",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## `eslint.config.js`

```javascript
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
```

---

## `hooks/use-color-scheme.ts`

```typescript
export { useColorScheme } from 'react-native';
```

---

## `hooks/use-color-scheme.web.ts`

```typescript
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
```

---

## `hooks/use-theme-color.ts`

```typescript
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
```

---

## `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

---
