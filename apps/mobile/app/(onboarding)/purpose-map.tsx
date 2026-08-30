import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FormNotice } from '@/components/FormNotice';
import { OnboardingLoading } from '@/components/onboarding/OnboardingLoading';
import { theme } from '@/constants/theme';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { formatUsd } from '@/lib/format/money';
import { colorForToken } from '@/lib/onboarding/labels';

const PATHWAYS: { title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Reliable Vehicle', description: 'Save toward a dependable car', icon: 'car-outline' },
  {
    title: 'Housing Stability',
    description: 'Security deposit & rent buffer',
    icon: 'home-outline',
  },
  {
    title: 'Workforce & Career',
    description: 'Training, certs & career mobility',
    icon: 'school-outline',
  },
  { title: 'Business', description: 'Small business & side hustle', icon: 'storefront-outline' },
  {
    title: 'Childcare',
    description: 'Childcare stability & backup',
    icon: 'heart-outline',
  },
];

type Selection = { type: 'skip' } | { type: 'template'; id: string } | { type: 'custom' };

export default function PurposeMapScreen() {
  const { content, isLoading, saveGoal } = useOnboarding();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!content) return;
    if (content.progress.goalSkipped) {
      setSelection({ type: 'skip' });
      return;
    }
    if (content.progress.goal?.templateId) {
      setSelection({ type: 'template', id: content.progress.goal.templateId });
    }
  }, [content]);

  const selectedValues = useMemo(() => {
    if (!content) return [];
    const keys = new Set(content.progress.valueKeys);
    return content.values.filter((value) => keys.has(value.key));
  }, [content]);

  const filteredGoals = useMemo(() => {
    if (!content) return [];
    const keys = new Set(content.progress.valueKeys);
    if (keys.size === 0) return content.goalTemplates;
    return content.goalTemplates.filter((goal) => keys.has(goal.valueKey));
  }, [content]);

  if (isLoading || !content) {
    return <OnboardingLoading />;
  }

  const valueByKey = new Map(content.values.map((value) => [value.key, value]));

  const onContinue = async () => {
    if (!selection) return;
    setError(null);
    setSaving(true);
    try {
      if (selection.type === 'skip') {
        await saveGoal({ skip: true });
      } else if (selection.type === 'template') {
        await saveGoal({ templateId: selection.id });
      } else {
        const amount = Number(customAmount);
        if (!customTitle.trim() || !Number.isFinite(amount)) {
          setError('Add a goal name and a target between $1 and $10,000.');
          setSaving(false);
          return;
        }
        await saveGoal({ title: customTitle.trim(), targetAmount: amount });
      }
      router.push('/(onboarding)/habits');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addCustomGoal = () => {
    const amount = Number(customAmount);
    if (!customTitle.trim() || !Number.isFinite(amount) || amount < 1 || amount > 10_000) {
      setError('Add a goal name and a target between $1 and $10,000.');
      return;
    }
    setError(null);
    setSelection({ type: 'custom' });
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>STEP 2 OF 3</Text>
      <Text style={styles.heading}>Your PurposeMap™</Text>
      <Text style={styles.sub}>
        Based on your values, here are your personalized goals. Tap one to start — or build habits
        first.
      </Text>

      <View style={styles.chips}>
        {selectedValues.map((value) => (
          <View key={value.key} style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: colorForToken(value.colorToken) }]} />
            <Text style={styles.chipText}>{value.label}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityLabel="Build Habits First"
        accessibilityRole="button"
        accessibilityState={{ selected: selection?.type === 'skip' }}
        onPress={() => setSelection({ type: 'skip' })}
        style={[styles.habitsFirst, selection?.type === 'skip' && styles.cardSelected]}>
        <View style={styles.habitsFirstCopy}>
          <View style={styles.habitsFirstTitleRow}>
            <Text style={styles.habitsFirstTitle}>Build Habits First</Text>
            <View style={styles.recommended}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          </View>
          <Text style={styles.habitsFirstBody}>Not ready to save? Start with small, doable habits.</Text>
          <Text style={styles.habitsFirstAccent}>When you're ready, saving will feel natural.</Text>
        </View>
        <View style={[styles.check, selection?.type === 'skip' && styles.checkSelected]}>
          {selection?.type === 'skip' ? (
            <Ionicons color={theme.colors.white} name="checkmark" size={14} />
          ) : null}
        </View>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR PICK A SAVINGS GOAL</Text>
        <View style={styles.dividerLine} />
      </View>

      {filteredGoals.map((goal) => {
        const value = valueByKey.get(goal.valueKey);
        const isSelected = selection?.type === 'template' && selection.id === goal.id;
        return (
          <Pressable
            accessibilityLabel={goal.title}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={goal.id}
            onPress={() => setSelection({ type: 'template', id: goal.id })}
            style={[styles.goalCard, isSelected && styles.cardSelected]}>
            <View style={styles.goalTop}>
              <Text style={styles.goalEmoji}>{goal.iconEmoji}</Text>
              <View style={[styles.check, isSelected && styles.checkSelected]}>
                {isSelected ? (
                  <Ionicons color={theme.colors.white} name="checkmark" size={14} />
                ) : null}
              </View>
            </View>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <View style={styles.goalTags}>
              {value ? (
                <View style={styles.tag}>
                  <View
                    style={[styles.chipDot, { backgroundColor: colorForToken(value.colorToken) }]}
                  />
                  <Text style={styles.tagText}>{value.label}</Text>
                </View>
              ) : null}
              <View style={[styles.tag, styles.amountTag]}>
                <Text style={styles.tagText}>{formatUsd(goal.targetAmount)}</Text>
              </View>
              {goal.isPathwayEligible ? (
                <View style={[styles.tag, styles.pathwayTag]}>
                  <Text style={styles.pathwayTagText}>Pathway</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityLabel="Create your own goal"
        accessibilityRole="button"
        accessibilityState={{ expanded: createOpen, selected: selection?.type === 'custom' }}
        onPress={() => setCreateOpen((open) => !open)}
        style={[styles.createCard, selection?.type === 'custom' && styles.cardSelected]}>
        <Text style={styles.createTitle}>Create your own goal</Text>
        <Text style={styles.createSub}>Save for what matters most to you</Text>
      </Pressable>

      {createOpen ? (
        <View style={styles.createForm}>
          <Text style={styles.fieldLabel}>What are you saving for?</Text>
          <TextInput
            accessibilityLabel="What are you saving for?"
            maxLength={50}
            onChangeText={setCustomTitle}
            placeholder="e.g., School supplies, Car repair"
            placeholderTextColor={theme.colors.disabled}
            style={styles.input}
            value={customTitle}
          />
          <Text style={styles.counter}>{customTitle.length}/50 characters</Text>
          <Text style={styles.fieldLabel}>Target amount ($)</Text>
          <TextInput
            accessibilityLabel="Target amount in dollars"
            keyboardType="numeric"
            onChangeText={setCustomAmount}
            placeholder="e.g., 50"
            placeholderTextColor={theme.colors.disabled}
            style={styles.input}
            value={customAmount}
          />
          <Text style={styles.helper}>Between $1 and $10,000</Text>
          <AppButton
            accessibilityLabel="Add This Goal"
            onPress={addCustomGoal}
            title="Add This Goal"
            variant="gold"
          />
        </View>
      ) : null}

      <View style={styles.pathways}>
        <Text style={styles.pathwaysTitle}>Your Pathways Unlocked</Text>
        <Text style={styles.pathwaysSub}>
          Save enough and we connect you with trusted partners—not predatory lenders
        </Text>
        {PATHWAYS.map((pathway) => (
          <View key={pathway.title} style={styles.pathwayRow}>
            <Ionicons color={theme.colors.deepGreen} name={pathway.icon} size={20} />
            <View style={styles.pathwayCopy}>
              <Text style={styles.pathwayTitle}>{pathway.title}</Text>
              <Text style={styles.pathwayBody}>{pathway.description}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.pathwaysFooter}>
          As you save, you'll unlock life-transition pathways matched with community partners.
        </Text>
      </View>

      <FormNotice message={error ?? undefined} />
      <AppButton
        accessibilityLabel="Start With This Goal"
        disabled={!selection}
        loading={saving}
        onPress={() => void onContinue()}
        title="Start With This Goal"
        variant="gold"
      />
      <Text style={styles.footnote}>Don't worry—you can always add more goals later!</Text>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'center',
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: theme.spacing.sm,
  },
  chipDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  habitsFirst: {
    alignItems: 'center',
    backgroundColor: theme.colors.paleGold,
    borderColor: theme.colors.gold,
    borderRadius: theme.radius.lg,
    borderStyle: 'dashed',
    borderWidth: 2,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  habitsFirstCopy: {
    flex: 1,
    gap: 4,
  },
  habitsFirstTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  habitsFirstTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  recommended: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  recommendedText: {
    color: theme.colors.darkGreenText,
    fontSize: 10,
    fontWeight: '800',
  },
  habitsFirstBody: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  habitsFirstAccent: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    lineHeight: 20,
  },
  check: {
    alignItems: 'center',
    borderColor: theme.colors.disabled,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkSelected: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  cardSelected: {
    borderColor: theme.colors.deepGreen,
    borderWidth: 2,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  dividerLine: {
    backgroundColor: theme.colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  goalCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalEmoji: {
    fontSize: 28,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
    marginTop: theme.spacing.xs,
  },
  goalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tag: {
    alignItems: 'center',
    backgroundColor: theme.colors.graphite,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  amountTag: {
    backgroundColor: theme.colors.paleGold,
  },
  pathwayTag: {
    backgroundColor: theme.colors.accentSoft,
  },
  tagText: {
    color: theme.colors.darkGreenText,
    fontSize: 11,
    fontWeight: '700',
  },
  pathwayTagText: {
    color: theme.colors.accentDark,
    fontSize: 11,
    fontWeight: '800',
  },
  createCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.deepGreen,
    borderRadius: theme.radius.lg,
    borderStyle: 'dashed',
    borderWidth: 2,
    padding: theme.spacing.md,
  },
  createTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  createSub: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  createForm: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.deepGreen,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  counter: {
    color: theme.colors.mutedText,
    fontSize: 11,
    textAlign: 'right',
  },
  helper: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  pathways: {
    backgroundColor: theme.colors.lavender,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  pathwaysTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  pathwaysSub: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  pathwayRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 44,
    padding: theme.spacing.sm,
  },
  pathwayCopy: {
    flex: 1,
  },
  pathwayTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  pathwayBody: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  pathwaysFooter: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footnote: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
