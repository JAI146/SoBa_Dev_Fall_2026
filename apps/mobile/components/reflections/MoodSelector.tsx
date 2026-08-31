import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
const MOODS = [
  { score: 1, emoji: '😞', label: 'Very low' },
  { score: 2, emoji: '🙁', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😊', label: 'Very good' },
] as const;
export function MoodSelector({
  value,
  onChange,
  allowClear = false,
}: {
  value: number | null;
  onChange: (score: number | null) => void;
  allowClear?: boolean;
}) {
  return (
    <View
      accessibilityLabel="Mood from 1 to 5"
      accessibilityRole="radiogroup"
      style={styles.row}
    >
      {MOODS.map((mood) => {
        const selected = value === mood.score;
        return (
          <Pressable
            accessibilityLabel={`${mood.label}, ${mood.score} out of 5`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={mood.score}
            onPress={() => onChange(selected && allowClear ? null : mood.score)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text style={[styles.score, selected && styles.scoreSelected]}>
              {mood.score}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
export function moodEmoji(score: number | null) {
  return score === null
    ? '—'
    : (MOODS.find((item) => item.score === score)?.emoji ?? '—');
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  option: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 52,
    padding: 6,
  },
  selected: {
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.deepGreen,
    borderWidth: 2,
  },
  emoji: { fontSize: 22 },
  score: { color: theme.colors.mutedText, fontSize: 11, fontWeight: '800' },
  scoreSelected: { color: theme.colors.deepGreen },
});
