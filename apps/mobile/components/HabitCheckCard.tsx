import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';
import { type Habit } from '@/lib/fixtures/habits';
import { formatHabitSchedule } from '@/lib/habits/schedule';

type HabitCheckCardProps = {
  habit: Habit;
  goalTitle?: string;
  onOpen: () => void;
  onToggle: () => void;
};

export function HabitCheckCard({ habit, goalTitle, onOpen, onToggle }: HabitCheckCardProps) {
  const completion = useSharedValue(habit.completedToday ? 1 : 0);
  const checkScale = useSharedValue(1);

  useEffect(() => {
    completion.value = withTiming(habit.completedToday ? 1 : 0, { duration: 240 });
  }, [completion, habit.completedToday]);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      completion.value,
      [0, 1],
      [theme.colors.white, theme.colors.lightMint],
    ),
    borderColor: interpolateColor(
      completion.value,
      [0, 1],
      [theme.colors.border, theme.colors.teal],
    ),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleToggle = () => {
    const nextValue = habit.completedToday ? 0 : 1;
    completion.value = withTiming(nextValue, { duration: 240 });
    checkScale.value = withSequence(
      withTiming(0.84, { duration: 80 }),
      withTiming(1, { duration: 140 }),
    );
    onToggle();
  };

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Pressable
        accessibilityLabel={`${habit.completedToday ? 'Completed' : 'Mark complete'}: ${habit.title}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: habit.completedToday }}
        hitSlop={4}
        onPress={handleToggle}
        style={styles.checkTarget}>
        <Animated.View
          style={[styles.check, habit.completedToday && styles.checkCompleted, checkStyle]}>
          {habit.completedToday ? (
            <Ionicons color={theme.colors.white} name="checkmark" size={19} />
          ) : null}
        </Animated.View>
      </Pressable>

      <TouchableOpacity
        accessibilityLabel={`Open habit: ${habit.title}`}
        accessibilityRole="button"
        activeOpacity={0.72}
        onPress={onOpen}
        style={styles.openTarget}>
        <View style={styles.copy}>
          <Text style={[styles.title, habit.completedToday && styles.titleCompleted]}>
            {habit.title}
          </Text>
          <Text style={styles.meta}>
            {formatHabitSchedule(habit)} | {habit.currentStreak}-check-in streak
          </Text>
          {goalTitle ? <Text style={styles.goal}>Supports: {goalTitle}</Text> : null}
        </View>
        <Ionicons color={theme.colors.disabled} name="chevron-forward" size={20} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 92,
    overflow: 'hidden',
    paddingLeft: theme.spacing.xs,
  },
  checkTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    width: 52,
  },
  check: {
    alignItems: 'center',
    borderColor: theme.colors.disabled,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  checkCompleted: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  openTarget: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 90,
    paddingBottom: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
    lineHeight: 22,
  },
  titleCompleted: {
    color: theme.colors.deepGreen,
  },
  meta: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xxs,
  },
  goal: {
    color: theme.colors.teal,
    fontSize: 11,
    fontWeight: '700',
    marginTop: theme.spacing.xxs,
  },
});
