import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { DecorativeBlob } from '@/components/DecorativeBlob';
import { HabitCheckCard } from '@/components/HabitCheckCard';
import { theme } from '@/constants/theme';
import { useDemoProgress } from '@/contexts/DemoProgressContext';

export default function HabitsScreen() {
  const { goals, habits, toggleHabit } = useDemoProgress();
  const todaysHabits = habits;
  const completedCount = todaysHabits.filter((habit) => habit.completedToday).length;

  const handleToggle = (habitId: string) => {
    const habit = habits.find((item) => item.id === habitId);
    if (habit && !habit.completedToday) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    toggleHabit(habitId);
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>TODAY'S RHYTHM</Text>
        <Text style={styles.title}>Small steps for today</Text>
        <Text style={styles.subtitle}>
          Keep the list short. Each check-in supports something that matters to you.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <DecorativeBlob style={styles.summaryGoldBlob} />
        <DecorativeBlob style={styles.summaryOutlineBlob} />
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryIcon}>
            <Ionicons color={theme.colors.deepGreen} name="checkmark-done" size={24} />
          </View>
          <Text style={styles.summaryCount}>
            {completedCount}/{todaysHabits.length}
          </Text>
        </View>
        <Text style={styles.summaryTitle}>
          {completedCount === todaysHabits.length && todaysHabits.length > 0
            ? 'You showed up for every small step'
            : 'A calm plan, not a crowded one'}
        </Text>
        <Text style={styles.summaryText}>
          {completedCount > 0
            ? `${completedCount} complete. Let the next one be enough for now.`
            : 'Start with the action that feels easiest to make real.'}
        </Text>
      </View>

      {todaysHabits.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Today's habits</Text>
            <Text style={styles.sectionDetail}>{todaysHabits.length} scheduled</Text>
          </View>

          <View style={styles.habitList}>
            {todaysHabits.map((habit) => {
              const goal = goals.find((item) => item.id === habit.goalId);
              return (
                <HabitCheckCard
                  goalTitle={goal?.title}
                  habit={habit}
                  key={habit.id}
                  onOpen={() =>
                    router.push({
                      pathname: '/(tabs)/habits/[habitId]',
                      params: { habitId: habit.id },
                    })
                  }
                  onToggle={() => handleToggle(habit.id)}
                />
              );
            })}
          </View>

          <View style={styles.rhythmNote}>
            <Ionicons color={theme.colors.teal} name="heart-outline" size={20} />
            <Text style={styles.rhythmNoteText}>Consistency matters more than perfection.</Text>
          </View>
        </View>
      ) : (
        <HabitsEmptyState />
      )}
    </AppScreen>
  );
}

function HabitsEmptyState() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyArtwork}>
        <DecorativeBlob style={styles.emptyGoldBlob} />
        <DecorativeBlob style={styles.emptyTealBlob} />
        <View style={styles.emptyIcon}>
          <Ionicons color={theme.colors.deepGreen} name="sunny-outline" size={34} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Nothing is asking for your attention today</Text>
      <Text style={styles.emptyText}>
        Take the breathing room. Your next small habit will be here when it is time.
      </Text>
      <View style={styles.emptyPill}>
        <Ionicons color={theme.colors.teal} name="leaf-outline" size={16} />
        <Text style={styles.emptyPillText}>A quiet day still counts</Text>
      </View>
    </View>
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
    lineHeight: 40,
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
    minHeight: 250,
    overflow: 'hidden',
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  summaryTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  summaryCount: {
    color: theme.colors.gold,
    fontSize: 24,
    fontWeight: '900',
  },
  summaryTitle: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
    lineHeight: 33,
    marginTop: theme.spacing.lg,
    maxWidth: 290,
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
    bottom: -48,
    height: 130,
    opacity: 0.92,
    right: -22,
    width: 130,
  },
  summaryOutlineBlob: {
    borderColor: 'rgba(255,255,255,0.17)',
    borderWidth: 20,
    height: 170,
    right: -76,
    top: -70,
    width: 170,
  },
  section: {
    gap: theme.spacing.md,
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
  habitList: {
    gap: theme.spacing.sm,
  },
  rhythmNote: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
  },
  rhythmNoteText: {
    color: theme.colors.mintDark,
    flex: 1,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.xl,
    ...theme.shadows.card,
  },
  emptyArtwork: {
    alignItems: 'center',
    height: 132,
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    width: 190,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
    ...theme.shadows.card,
  },
  emptyGoldBlob: {
    backgroundColor: theme.colors.paleGold,
    height: 102,
    left: 6,
    top: 8,
    width: 102,
  },
  emptyTealBlob: {
    backgroundColor: theme.colors.accentSoft,
    bottom: 4,
    height: 88,
    right: 12,
    width: 88,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 29,
    maxWidth: 290,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    maxWidth: 290,
    textAlign: 'center',
  },
  emptyPill: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
  },
  emptyPillText: {
    color: theme.colors.teal,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
  },
});
