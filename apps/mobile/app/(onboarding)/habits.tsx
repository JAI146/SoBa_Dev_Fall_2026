import { HabitCategory, type HabitCategoryValue } from '@purposemint/contracts';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FormNotice } from '@/components/FormNotice';
import { OnboardingLoading } from '@/components/onboarding/OnboardingLoading';
import { QueryErrorState } from '@/components/QueryErrorState';
import { theme } from '@/constants/theme';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { formatUsdExact } from '@/lib/format/money';
import { frequencyLabel } from '@/lib/onboarding/labels';

const FILTERS: { id: 'all' | HabitCategoryValue; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: HabitCategory.MONEY, label: 'Money' },
  { id: HabitCategory.MINDSET, label: 'Mindset' },
  { id: HabitCategory.MOTIVATION, label: 'Motivation' },
];

export default function HabitsScreen() {
  const { complete, content, errorMessage, isLoading, refresh, saveHabits } = useOnboarding();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | HabitCategoryValue>('all');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (content?.progress.habitTemplateIds) {
      setSelected(content.progress.habitTemplateIds);
    }
  }, [content?.progress.habitTemplateIds]);

  const visibleHabits = useMemo(() => {
    if (!content) return [];
    if (filter === 'all') return content.habitTemplates;
    return content.habitTemplates.filter((habit) => habit.category === filter);
  }, [content, filter]);

  const selectedHabits = useMemo(() => {
    if (!content) return [];
    return content.habitTemplates.filter((habit) => selected.includes(habit.id));
  }, [content, selected]);

  if (errorMessage && !content) {
    return <QueryErrorState message={errorMessage} onRetry={() => void refresh()} />;
  }

  if (isLoading || !content) {
    return <OnboardingLoading />;
  }

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const onStart = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveHabits({ templateIds: selected });
      await complete();
      router.replace('/(tabs)');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const focusGoal = content.progress.goal;

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Build Your Habits</Text>
      <Text style={styles.sub}>
        These small, sustainable habits will help you reach your goal—one day at a time.
      </Text>

      {focusGoal ? (
        <View style={styles.focusBanner}>
          <Text style={styles.focusLabel}>Your Focus Goal</Text>
          <Text style={styles.focusTitle}>{focusGoal.title}</Text>
          <Text style={styles.focusTarget}>Target: {formatUsdExact(focusGoal.targetAmount)}</Text>
        </View>
      ) : null}

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const isActive = filter === item.id;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={[styles.filter, isActive && styles.filterActive]}>
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chooseRow}>
        <Text style={styles.chooseLabel}>CHOOSE YOUR HABITS</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{selected.length} selected</Text>
        </View>
      </View>

      {visibleHabits.map((habit) => {
        const isSelected = selected.includes(habit.id);
        return (
          <Pressable
            accessibilityLabel={habit.title}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={habit.id}
            onPress={() => toggle(habit.id)}
            style={[styles.habitCard, isSelected && styles.habitCardSelected]}>
            <View style={[styles.check, isSelected && styles.checkSelected]}>
              {isSelected ? (
                <Text style={styles.checkMark}>✓</Text>
              ) : null}
            </View>
            <Text style={styles.habitEmoji}>{habit.iconEmoji}</Text>
            <View style={styles.habitCopy}>
              <Text style={styles.habitTitle}>{habit.title}</Text>
              <Text style={styles.habitBody}>{habit.description}</Text>
            </View>
            <View style={styles.frequency}>
              <Text style={styles.frequencyText}>{frequencyLabel(habit.frequency)}</Text>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.proTip}>
        <Text style={styles.proTipText}>
          On paid plans, "Lock My Savings" adds a short wait before a withdrawal — enough to pause
          and think. You can turn it off anytime. It's your money.
        </Text>
      </View>

      <View style={styles.plan}>
        <Text style={styles.planTitle}>Your Habit Plan</Text>
        <View style={styles.planChips}>
          {selectedHabits.map((habit) => (
            <View key={habit.id} style={styles.planChip}>
              <Text style={styles.planChipText}>
                {habit.iconEmoji} {habit.title}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <FormNotice message={error ?? undefined} />
      <AppButton
        accessibilityLabel="Start My Journey"
        loading={saving}
        onPress={() => void onStart()}
        title="Start My Journey"
        variant="gold"
      />
      <Text style={styles.footnote}>
        {selected.length} habits selected — you got this!
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
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
  focusBanner: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  focusLabel: {
    color: theme.colors.deepGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  focusTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
    marginTop: 4,
  },
  focusTarget: {
    color: theme.colors.gold,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
    marginTop: 4,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  filter: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.teal,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  filterActive: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  filterText: {
    color: theme.colors.teal,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  chooseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chooseLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  countPill: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  countText: {
    color: theme.colors.deepGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  habitCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 72,
    padding: theme.spacing.sm,
  },
  habitCardSelected: {
    borderColor: theme.colors.deepGreen,
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
  checkMark: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  habitEmoji: {
    fontSize: 22,
  },
  habitCopy: {
    flex: 1,
  },
  habitTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  habitBody: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  frequency: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  frequencyText: {
    color: theme.colors.teal,
    fontSize: 11,
    fontWeight: '800',
  },
  proTip: {
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  proTipText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  plan: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  planTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  planChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  planChip: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  planChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  footnote: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
