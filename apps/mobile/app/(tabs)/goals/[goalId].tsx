import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppScreen } from '@/components/AppScreen';
import { DecorativeBlob } from '@/components/DecorativeBlob';
import { theme } from '@/constants/theme';
import { useDemoProgress } from '@/contexts/DemoProgressContext';
import { formatHabitSchedule } from '@/lib/habits/schedule';

const contributionPresets = [10, 20, 50] as const;

function formatCurrency(amount: number) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export default function GoalDetailScreen() {
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const { goals, habits, contributeToGoal } = useDemoProgress();
  const goal = goals.find((item) => item.id === goalId);
  const [customAmount, setCustomAmount] = useState('');
  const [confirmation, setConfirmation] = useState<string>();

  if (!goal) {
    return (
      <AppScreen contentContainerStyle={styles.content}>
        <BackButton />
        <View style={styles.missingCard}>
          <Ionicons color={theme.colors.deepGreen} name="compass-outline" size={36} />
          <Text style={styles.missingTitle}>This goal is not in view right now</Text>
          <Text style={styles.missingText}>Head back to your goals and choose another path.</Text>
        </View>
      </AppScreen>
    );
  }

  const progress = goal.currentAmount / goal.targetAmount;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const linkedHabits = habits.filter((habit) => habit.goalId === goal.id);
  const isComplete = remaining === 0;

  const addContribution = (amount: number) => {
    Keyboard.dismiss();
    const wholeAmount = Math.max(0, Math.round(amount));
    if (wholeAmount === 0 || isComplete) {
      return;
    }

    const appliedAmount = Math.min(wholeAmount, remaining);
    contributeToGoal(goal.id, appliedAmount);
    setCustomAmount('');
    setConfirmation(`${formatCurrency(appliedAmount)} moved this goal forward.`);
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <BackButton />

      <View style={styles.heroCard}>
        <DecorativeBlob style={styles.heroGoldBlob} />
        <DecorativeBlob style={styles.heroTealBlob} />
        <View style={styles.valuePill}>
          <Text style={styles.valueText}>{goal.valueName}</Text>
        </View>
        <Text style={styles.heroTitle}>{goal.title}</Text>
        <Text style={styles.heroDescription}>{goal.description}</Text>
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroAmount}>{formatCurrency(goal.currentAmount)}</Text>
          <Text style={styles.heroTarget}>of {formatCurrency(goal.targetAmount)}</Text>
        </View>
        <AnimatedProgressBar
          fillStyle={styles.heroProgressFill}
          progress={progress}
          trackStyle={styles.heroProgressTrack}
        />
        <View style={styles.heroFooter}>
          <Text style={styles.heroPercent}>{Math.round(progress * 100)}%</Text>
          <Text style={styles.heroRemaining}>
            {isComplete ? 'You made it' : `${formatCurrency(remaining)} to go`}
          </Text>
        </View>
      </View>

      <View style={styles.encouragementCard}>
        <View style={styles.encouragementIcon}>
          <Ionicons color={theme.colors.teal} name="leaf-outline" size={22} />
        </View>
        <View style={styles.encouragementCopy}>
          <Text style={styles.encouragementTitle}>A steady step counts</Text>
          <Text style={styles.encouragementText}>{goal.encouragement}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add a contribution</Text>
        <Text style={styles.sectionSubtitle}>
          Choose a small amount that feels comfortable today.
        </Text>

        <View style={styles.presetRow}>
          {contributionPresets.map((amount) => (
            <Pressable
              accessibilityLabel={`Contribute ${formatCurrency(amount)} to ${goal.title}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: isComplete }}
              disabled={isComplete}
              key={amount}
              onPress={() => addContribution(amount)}
              style={({ pressed }) => [
                styles.presetButton,
                pressed && styles.presetButtonPressed,
                isComplete && styles.disabledButton,
              ]}>
              <Text style={styles.presetText}>+{formatCurrency(amount)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.customRow}>
          <View style={styles.amountInputFrame}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              accessibilityLabel="Custom contribution amount"
              editable={!isComplete}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={5}
              onChangeText={(value) => {
                setCustomAmount(value.replace(/\D/g, ''));
                setConfirmation(undefined);
              }}
              onSubmitEditing={() => addContribution(Number(customAmount))}
              placeholder="Other amount"
              placeholderTextColor={theme.colors.disabled}
              returnKeyType="done"
              style={styles.amountInput}
              value={customAmount}
            />
          </View>
          <TouchableOpacity
            accessibilityLabel={`Add custom contribution to ${goal.title}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isComplete || !customAmount }}
            activeOpacity={0.8}
            disabled={isComplete || !customAmount}
            onPress={() => addContribution(Number(customAmount))}
            style={[
              styles.addButton,
              (isComplete || !customAmount) && styles.disabledButton,
            ]}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {confirmation ? (
          <View accessibilityLiveRegion="polite" style={styles.confirmation}>
            <Ionicons color={theme.colors.teal} name="checkmark-circle" size={19} />
            <Text style={styles.confirmationText}>{confirmation}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Habits supporting this goal</Text>
          <Text style={styles.sectionCount}>{linkedHabits.length}</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Small actions keep the intention close.</Text>

        {linkedHabits.length > 0 ? (
          <View style={styles.habitList}>
            {linkedHabits.map((habit) => (
              <TouchableOpacity
                accessibilityLabel={`Open habit: ${habit.title}`}
                accessibilityRole="button"
                activeOpacity={0.75}
                key={habit.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/habits/[habitId]',
                    params: { habitId: habit.id },
                  })
                }
                style={styles.habitCard}>
                <View
                  style={[
                    styles.habitStatus,
                    habit.completedToday && styles.habitStatusComplete,
                  ]}>
                  <Ionicons
                    color={habit.completedToday ? theme.colors.white : theme.colors.deepGreen}
                    name={habit.completedToday ? 'checkmark' : 'repeat-outline'}
                    size={18}
                  />
                </View>
                <View style={styles.habitCopy}>
                  <Text style={styles.habitTitle}>{habit.title}</Text>
                  <Text style={styles.habitMeta}>
                    {habit.completedToday ? 'Complete today' : formatHabitSchedule(habit)}
                  </Text>
                </View>
                <Ionicons color={theme.colors.disabled} name="chevron-forward" size={19} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.noHabitsCard}>
            <Text style={styles.noHabitsText}>No habits are linked to this goal yet.</Text>
          </View>
        )}
      </View>
    </AppScreen>
  );
}

function BackButton() {
  return (
    <TouchableOpacity
      accessibilityLabel="Back to goals"
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={() => router.back()}
      style={styles.backButton}>
      <Ionicons color={theme.colors.deepGreen} name="arrow-back" size={21} />
      <Text style={styles.backText}>Goals</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 44,
    paddingRight: theme.spacing.sm,
  },
  backText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.xl,
    minHeight: 350,
    overflow: 'hidden',
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  valuePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    zIndex: 1,
  },
  valueText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.9,
    lineHeight: 37,
    marginTop: theme.spacing.lg,
    maxWidth: 300,
    zIndex: 1,
  },
  heroDescription: {
    color: '#F8DDEB',
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    maxWidth: 285,
    zIndex: 1,
  },
  heroAmountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    zIndex: 1,
  },
  heroAmount: {
    color: theme.colors.white,
    fontSize: 29,
    fontWeight: '900',
  },
  heroTarget: {
    color: '#F8DDEB',
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  heroProgressTrack: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  heroProgressFill: {
    backgroundColor: theme.colors.teal,
  },
  heroFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    zIndex: 1,
  },
  heroPercent: {
    color: theme.colors.gold,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroRemaining: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  heroGoldBlob: {
    backgroundColor: theme.colors.gold,
    height: 126,
    opacity: 0.94,
    right: -36,
    top: -32,
    width: 126,
  },
  heroTealBlob: {
    backgroundColor: theme.colors.teal,
    bottom: -78,
    height: 180,
    opacity: 0.65,
    right: -42,
    width: 180,
  },
  encouragementCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  encouragementIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  encouragementCopy: {
    flex: 1,
  },
  encouragementTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  encouragementText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sectionCount: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  presetButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  presetButtonPressed: {
    backgroundColor: theme.colors.lavender,
    transform: [{ scale: 0.98 }],
  },
  presetText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  customRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  amountInputFrame: {
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingLeft: theme.spacing.md,
  },
  currencyPrefix: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  amountInput: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.fontSize.md,
    minHeight: 52,
    paddingHorizontal: theme.spacing.xs,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    minHeight: 54,
    minWidth: 82,
    paddingHorizontal: theme.spacing.md,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmation: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
  },
  confirmationText: {
    color: theme.colors.mintDark,
    flex: 1,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  habitList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  habitCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 74,
    padding: theme.spacing.sm,
  },
  habitStatus: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  habitStatusComplete: {
    backgroundColor: theme.colors.deepGreen,
  },
  habitCopy: {
    flex: 1,
  },
  habitTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
    lineHeight: 19,
  },
  habitMeta: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    marginTop: 3,
  },
  noHabitsCard: {
    backgroundColor: theme.colors.cream,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  noHabitsText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  missingCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  missingTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  missingText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
