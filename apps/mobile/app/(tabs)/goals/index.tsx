import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { AppScreen } from '@/components/AppScreen';
import { DecorativeBlob } from '@/components/DecorativeBlob';
import { theme } from '@/constants/theme';
import { useDemoProgress } from '@/contexts/DemoProgressContext';
import { type GoalCategory } from '@/lib/fixtures/goals';

type IoniconName = keyof typeof Ionicons.glyphMap;

const categoryIcons: Record<GoalCategory, IoniconName> = {
  debt_payoff: 'card-outline',
  emergency_fund: 'umbrella-outline',
  family_travel: 'airplane-outline',
};

function formatCurrency(amount: number) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export default function GoalsScreen() {
  const { goals } = useDemoProgress();
  const nearlyComplete = goals.filter(
    (goal) => goal.currentAmount / goal.targetAmount >= 0.85,
  ).length;

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>YOUR NEXT CHAPTER</Text>
        <Text style={styles.title}>Goals with meaning</Text>
        <Text style={styles.subtitle}>
          A few clear commitments, each connected to the life you want to build.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <DecorativeBlob style={styles.summaryGoldBlob} />
        <DecorativeBlob style={styles.summaryOutlineBlob} />
        <View style={styles.summaryIcon}>
          <Ionicons color={theme.colors.deepGreen} name="sparkles" size={23} />
        </View>
        <Text style={styles.summaryEyebrow}>IN MOTION</Text>
        <Text style={styles.summaryTitle}>{goals.length} intentions, one steady rhythm</Text>
        <Text style={styles.summaryText}>
          {nearlyComplete > 0
            ? `${nearlyComplete} goal is almost within reach. Keep the next step small.`
            : 'Each small contribution is making the path feel clearer.'}
        </Text>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Your active goals</Text>
        <Text style={styles.sectionDetail}>{goals.length} total</Text>
      </View>

      <View style={styles.goalList}>
        {goals.map((goal) => {
          const progress = goal.currentAmount / goal.targetAmount;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          return (
            <TouchableOpacity
              accessibilityLabel={`Open goal: ${goal.title}, ${Math.round(progress * 100)} percent complete`}
              accessibilityRole="button"
              activeOpacity={0.78}
              key={goal.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/goals/[goalId]',
                  params: { goalId: goal.id },
                })
              }
              style={styles.goalCard}>
              <View style={styles.goalTopRow}>
                <View style={styles.goalIcon}>
                  <Ionicons
                    color={theme.colors.deepGreen}
                    name={categoryIcons[goal.category]}
                    size={24}
                  />
                </View>
                <View style={styles.valuePill}>
                  <Text style={styles.valueText}>{goal.valueName}</Text>
                </View>
              </View>

              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDescription}>{goal.description}</Text>

              <View style={styles.amountRow}>
                <Text style={styles.amount}>{formatCurrency(goal.currentAmount)}</Text>
                <Text style={styles.target}>of {formatCurrency(goal.targetAmount)}</Text>
              </View>
              <AnimatedProgressBar progress={progress} />

              <View style={styles.goalFooter}>
                <Text style={styles.remaining}>{formatCurrency(remaining)} to go</Text>
                <View style={styles.openLabel}>
                  <Text style={styles.openText}>See the plan</Text>
                  <Ionicons color={theme.colors.deepGreen} name="arrow-forward" size={17} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  eyebrow: {
    color: theme.colors.teal,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: theme.spacing.xxs,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.xs,
    maxWidth: 340,
  },
  summaryCard: {
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.xl,
    minHeight: 240,
    overflow: 'hidden',
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
    zIndex: 1,
  },
  summaryEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: theme.spacing.lg,
    zIndex: 1,
  },
  summaryTitle: {
    color: theme.colors.white,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.7,
    lineHeight: 31,
    marginTop: theme.spacing.xs,
    maxWidth: 280,
    zIndex: 1,
  },
  summaryText: {
    color: '#F8DDEB',
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    maxWidth: 280,
    zIndex: 1,
  },
  summaryGoldBlob: {
    backgroundColor: theme.colors.gold,
    height: 128,
    opacity: 0.92,
    right: -32,
    top: -30,
    width: 128,
  },
  summaryOutlineBlob: {
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 20,
    bottom: -72,
    height: 174,
    right: -52,
    width: 174,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionDetail: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  goalList: {
    gap: theme.spacing.md,
    marginTop: -theme.spacing.sm,
  },
  goalCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    minHeight: 286,
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
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  valuePill: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  valueText: {
    color: theme.colors.teal,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 27,
    marginTop: theme.spacing.md,
  },
  goalDescription: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  amountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  amount: {
    color: theme.colors.deepGreen,
    fontSize: 25,
    fontWeight: '900',
  },
  target: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  goalFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  remaining: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  openLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xxs,
    minHeight: 44,
  },
  openText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
});
