import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { FormNotice } from '@/components/FormNotice';
import { OnboardingLoading } from '@/components/onboarding/OnboardingLoading';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';

const LEVELS: {
  level: number;
  title: string;
  badge: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlighted?: boolean;
}[] = [
  {
    level: 1,
    title: 'Stash your first dollar',
    badge: '$1+',
    description: 'Round up your change or set a payday rule. Takes about a minute.',
    icon: 'ellipse-outline',
  },
  {
    level: 2,
    title: 'Hit your next $500',
    badge: '$500',
    description: 'The cushion that keeps a flat tire from becoming a payday loan.',
    icon: 'shield-checkmark-outline',
  },
  {
    level: 3,
    title: 'Keep a streak alive',
    badge: '8 weeks',
    description: "Lock your savings so it's harder to spend. Miss a week? Paused, not failed.",
    icon: 'lock-closed-outline',
  },
  {
    level: 4,
    title: 'Grow the buffer',
    badge: '$1,500',
    description: 'Enough to cover rent, childcare, or a gap between jobs.',
    icon: 'trending-up-outline',
  },
  {
    level: 5,
    title: 'Unlock a Pathway',
    badge: 'Ready',
    description:
      "Your savings become proof you're ready — and we match you with fair lenders and partners.",
    icon: 'key-outline',
    highlighted: true,
  },
];

export default function WelcomeScreen() {
  const { session } = useAuth();
  const { isLoading, saveWelcome } = useOnboarding();
  const [name, setName] = useState(
    session?.user.displayName ?? session?.user.firstName ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return <OnboardingLoading />;
  }

  const onContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("We'd love a name to greet you by.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveWelcome(trimmed);
      router.push('/(onboarding)/values');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View style={styles.heroIcon} accessibilityRole="image" accessibilityLabel="PurposeMint">
        <Ionicons color={theme.colors.white} name="business" size={28} />
      </View>
      <Text style={styles.heading}>Welcome to PurposeMint</Text>
      <Text style={styles.body}>
        PurposeMint helps you save a little at a time, safely — and turns those savings into a way
        forward: a car, a home, childcare, a better job. Not a payday loan.
      </Text>

      <View style={styles.badges}>
        {['Your money is held at a partner bank', 'No judgment', 'Start with what you have'].map(
          (label) => (
            <View key={label} style={styles.badge}>
              <Ionicons color={theme.colors.deepGreen} name="checkmark" size={14} />
              <Text style={styles.badgeText}>{label}</Text>
            </View>
          ),
        )}
      </View>

      <AppInput
        autoCapitalize="words"
        label="What should we call you?"
        onChangeText={setName}
        value={name}
      />
      <FormNotice message={error ?? undefined} />

      <Text style={styles.sectionTitle}>Five levels. Start at zero.</Text>
      <Text style={styles.sectionSub}>Each level is small enough to finish and worth celebrating.</Text>

      {LEVELS.map((level) => (
        <View
          key={level.level}
          style={[styles.levelCard, level.highlighted && styles.levelCardHighlighted]}>
          <View style={styles.levelIcon}>
            <Ionicons color={theme.colors.deepGreen} name={level.icon} size={22} />
          </View>
          <View style={styles.levelCopy}>
            <View style={styles.levelTitleRow}>
              <Text style={styles.levelTitle}>{level.title}</Text>
              <View style={styles.levelPills}>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>LEVEL {level.level}</Text>
                </View>
                <View style={[styles.levelPill, styles.levelBadgePill]}>
                  <Text style={styles.levelPillText}>{level.badge}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.levelDescription}>{level.description}</Text>
          </View>
        </View>
      ))}

      <AppButton
        accessibilityLabel="Start Where You Are"
        loading={saving}
        onPress={() => void onContinue()}
        title="Start Where You Are"
        variant="gold"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
  },
  heroIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  body: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'center',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
  },
  badgeText: {
    color: theme.colors.darkGreenText,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    marginTop: theme.spacing.sm,
  },
  sectionSub: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: -theme.spacing.xs,
  },
  levelCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  levelCardHighlighted: {
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.deepGreen,
  },
  levelIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  levelCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  levelTitleRow: {
    gap: theme.spacing.xxs,
  },
  levelTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  levelPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xxs,
  },
  levelPill: {
    backgroundColor: theme.colors.graphite,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  levelBadgePill: {
    backgroundColor: theme.colors.paleGold,
  },
  levelPillText: {
    color: theme.colors.darkGreenText,
    fontSize: 10,
    fontWeight: '800',
  },
  levelDescription: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
  },
});
