import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FormNotice } from '@/components/FormNotice';
import { OnboardingLoading } from '@/components/onboarding/OnboardingLoading';
import { ValuePicker } from '@/components/onboarding/ValuePicker';
import { QueryErrorState } from '@/components/QueryErrorState';
import { theme } from '@/constants/theme';
import { useOnboarding } from '@/contexts/OnboardingContext';

export default function ValuesScreen() {
  const { content, errorMessage, isLoading, refresh, saveValues } = useOnboarding();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (content?.progress.valueKeys) {
      setSelected(content.progress.valueKeys);
    }
  }, [content?.progress.valueKeys]);

  if (errorMessage && !content) {
    return <QueryErrorState message={errorMessage} onRetry={() => void refresh()} />;
  }

  if (isLoading || !content) {
    return <OnboardingLoading />;
  }

  const onNext = async () => {
    if (selected.length === 0) return;
    setError(null);
    setSaving(true);
    try {
      await saveValues({ valueKeys: selected });
      router.push('/(onboarding)/purpose-map');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>STEP 1 OF 3</Text>
      <Text style={styles.heading}>What Matters Most to You Right Now?</Text>
      <Text style={styles.sub}>
        No wrong answers. Pick what feels real to your life today. You can pick multiple.
      </Text>

      <ValuePicker values={content.values} selected={selected} onChange={setSelected} />

      <Text style={styles.hint}>Tap on one or more values to continue</Text>
      <FormNotice message={error ?? undefined} />
      <AppButton
        accessibilityLabel="Next: Your goal"
        disabled={selected.length === 0}
        loading={saving}
        onPress={() => void onNext()}
        title="Next: Your goal"
        variant="gold"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
  },
  eyebrow: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  heading: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  sub: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    width: '48%',
    ...theme.shadows.card,
  },
  cardSelected: {
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.deepGreen,
    borderWidth: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  icon: {
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  check: {
    alignItems: 'center',
    borderColor: theme.colors.disabled,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkSelected: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  cardBody: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  hint: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
