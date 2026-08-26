import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppScreen } from '@/components/AppScreen';
import { DecorativeBlob } from '@/components/DecorativeBlob';
import { theme } from '@/constants/theme';
import { useDemoProgress } from '@/contexts/DemoProgressContext';
import { formatHabitSchedule } from '@/lib/habits/schedule';

function dayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
}

export default function HabitDetailScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const { goals, habits, toggleHabit } = useDemoProgress();
  const habit = habits.find((item) => item.id === habitId);
  const completion = useSharedValue(habit?.completedToday ? 1 : 0);

  useEffect(() => {
    completion.value = withTiming(habit?.completedToday ? 1 : 0, { duration: 260 });
  }, [completion, habit?.completedToday]);

  const actionStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      completion.value,
      [0, 1],
      [theme.colors.deepGreen, theme.colors.teal],
    ),
  }));

  if (!habit) {
    return (
      <AppScreen contentContainerStyle={styles.content}>
        <BackButton />
        <View style={styles.missingCard}>
          <Ionicons color={theme.colors.deepGreen} name="compass-outline" size={36} />
          <Text style={styles.missingTitle}>This habit is not in view right now</Text>
          <Text style={styles.missingText}>Head back to today's habits and choose another.</Text>
        </View>
      </AppScreen>
    );
  }

  const goal = goals.find((item) => item.id === habit.goalId);
  const completedThisWeek = habit.completionHistory.filter((entry) => entry.completed).length;

  const handleToggle = () => {
    if (!habit.completedToday) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    toggleHabit(habit.id);
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <BackButton />

      <View style={styles.heroCard}>
        <DecorativeBlob style={styles.heroGoldBlob} />
        <DecorativeBlob style={styles.heroOutlineBlob} />
        <View style={styles.heroIcon}>
          <Ionicons color={theme.colors.deepGreen} name="repeat-outline" size={25} />
        </View>
        <Text style={styles.heroEyebrow}>{formatHabitSchedule(habit).toUpperCase()}</Text>
        <Text style={styles.heroTitle}>{habit.title}</Text>
        <Text style={styles.heroDescription}>{habit.description}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons color={theme.colors.gold} name="flame" size={23} />
          </View>
          <Text style={styles.statNumber}>{habit.currentStreak}</Text>
          <Text style={styles.statLabel}>Current streak</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconTeal}>
            <Ionicons color={theme.colors.teal} name="trophy-outline" size={22} />
          </View>
          <Text style={styles.statNumber}>{habit.longestStreak}</Text>
          <Text style={styles.statLabel}>Personal best</Text>
        </View>
      </View>

      <View style={styles.historyCard}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Last seven days</Text>
            <Text style={styles.sectionSubtitle}>{completedThisWeek} moments of follow-through</Text>
          </View>
          <View style={styles.weekPill}>
            <Text style={styles.weekPillText}>{completedThisWeek}/7</Text>
          </View>
        </View>

        <View style={styles.daysRow}>
          {habit.completionHistory.map((entry, index) => (
            <View key={entry.date} style={styles.dayColumn}>
              <View style={[styles.dayDot, entry.completed && styles.dayDotComplete]}>
                {entry.completed ? (
                  <Ionicons color={theme.colors.white} name="checkmark" size={17} />
                ) : (
                  <View style={styles.dayRest} />
                )}
              </View>
              <Text style={styles.dayLabel}>
                {index === habit.completionHistory.length - 1 ? 'T' : dayLabel(entry.date)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.perspectiveNote}>
          <Ionicons color={theme.colors.teal} name="heart-outline" size={20} />
          <Text style={styles.perspectiveText}>
            {habit.currentStreak === 0
              ? 'A missed day is information, not failure. Today can be a fresh start.'
              : 'The gaps belong in the story too. You kept finding your way back.'}
          </Text>
        </View>
      </View>

      {goal ? (
        <TouchableOpacity
          accessibilityLabel={`Open supporting goal: ${goal.title}`}
          accessibilityRole="button"
          activeOpacity={0.76}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/goals/[goalId]',
              params: { goalId: goal.id },
            })
          }
          style={styles.goalCard}>
          <View style={styles.goalIcon}>
            <Ionicons color={theme.colors.deepGreen} name="flag-outline" size={22} />
          </View>
          <View style={styles.goalCopy}>
            <Text style={styles.goalEyebrow}>THIS HABIT SUPPORTS</Text>
            <Text style={styles.goalTitle}>{goal.title}</Text>
          </View>
          <Ionicons color={theme.colors.disabled} name="chevron-forward" size={20} />
        </TouchableOpacity>
      ) : null}

      <Animated.View style={[styles.actionButton, actionStyle]}>
        <Pressable
          accessibilityLabel={
            habit.completedToday ? `Mark ${habit.title} incomplete` : `Complete ${habit.title}`
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked: habit.completedToday }}
          onPress={handleToggle}
          style={styles.actionTarget}>
          <Ionicons
            color={theme.colors.white}
            name={habit.completedToday ? 'checkmark-circle' : 'ellipse-outline'}
            size={23}
          />
          <Text style={styles.actionText}>
            {habit.completedToday ? 'Completed today' : 'Mark today complete'}
          </Text>
        </Pressable>
      </Animated.View>
    </AppScreen>
  );
}

function BackButton() {
  return (
    <TouchableOpacity
      accessibilityLabel="Back to habits"
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={() => router.back()}
      style={styles.backButton}>
      <Ionicons color={theme.colors.deepGreen} name="arrow-back" size={21} />
      <Text style={styles.backText}>Habits</Text>
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
    minHeight: 320,
    overflow: 'hidden',
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 50,
    justifyContent: 'center',
    width: 50,
    zIndex: 1,
  },
  heroEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: theme.spacing.xl,
    zIndex: 1,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginTop: theme.spacing.xs,
    maxWidth: 295,
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
  heroGoldBlob: {
    backgroundColor: theme.colors.gold,
    height: 128,
    opacity: 0.92,
    right: -30,
    top: -34,
    width: 128,
  },
  heroOutlineBlob: {
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 20,
    bottom: -78,
    height: 180,
    right: -50,
    width: 180,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 156,
    padding: theme.spacing.md,
  },
  statIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  statIconTeal: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  statNumber: {
    color: theme.colors.text,
    fontSize: 29,
    fontWeight: '900',
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  historyCard: {
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
  sectionSubtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    marginTop: 3,
  },
  weekPill: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  weekPillText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
  },
  dayColumn: {
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  dayDot: {
    alignItems: 'center',
    backgroundColor: theme.colors.graphite,
    borderRadius: theme.radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  dayDotComplete: {
    backgroundColor: theme.colors.deepGreen,
  },
  dayRest: {
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  dayLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  perspectiveNote: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  perspectiveText: {
    color: theme.colors.mintDark,
    flex: 1,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    lineHeight: 18,
  },
  goalCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 86,
    padding: theme.spacing.md,
  },
  goalIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  goalCopy: {
    flex: 1,
  },
  goalEyebrow: {
    color: theme.colors.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
    lineHeight: 19,
    marginTop: 3,
  },
  actionButton: {
    borderRadius: theme.radius.md,
    minHeight: 58,
    overflow: 'hidden',
    ...theme.shadows.button,
  },
  actionTarget: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
  },
  actionText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
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
