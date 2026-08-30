import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';

type HabitCheckCardProps = {
  title: string;
  description: string;
  iconEmoji: string;
  completedToday: boolean;
  onToggle: () => void;
};

export function HabitCheckCard({
  title,
  description,
  iconEmoji,
  completedToday,
  onToggle,
}: HabitCheckCardProps) {
  const completion = useSharedValue(completedToday ? 1 : 0);
  const checkScale = useSharedValue(1);

  useEffect(() => {
    completion.value = withTiming(completedToday ? 1 : 0, { duration: 240 });
  }, [completion, completedToday]);

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
    const nextValue = completedToday ? 0 : 1;
    completion.value = withTiming(nextValue, { duration: 240 });
    checkScale.value = withSequence(
      withTiming(0.84, { duration: 80 }),
      withTiming(1, { duration: 140 }),
    );
    onToggle();
  };

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Text style={styles.emoji}>{iconEmoji}</Text>
      <View style={styles.copy}>
        <Text style={[styles.title, completedToday && styles.titleCompleted]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Pressable
        accessibilityLabel={`${completedToday ? 'Completed' : 'Mark complete'}: ${title}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completedToday }}
        hitSlop={4}
        onPress={handleToggle}
        style={styles.checkTarget}>
        <Animated.View style={[styles.check, completedToday && styles.checkCompleted, checkStyle]}>
          {completedToday ? (
            <Ionicons color={theme.colors.white} name="checkmark" size={19} />
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 72,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  emoji: {
    fontSize: 22,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
    lineHeight: 20,
  },
  titleCompleted: {
    color: theme.colors.deepGreen,
  },
  description: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  checkTarget: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
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
});
