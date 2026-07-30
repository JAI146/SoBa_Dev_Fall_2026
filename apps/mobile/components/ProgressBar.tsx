import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';

type ProgressBarProps = {
  progress: number;
  trackStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
};

export function ProgressBar({ progress, trackStyle, fillStyle }: ProgressBarProps) {
  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const fillWidth = `${normalizedProgress * 100}%` as `${number}%`;

  return (
    <View
      accessibilityLabel={`${Math.round(normalizedProgress * 100)} percent complete`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(normalizedProgress * 100) }}
      style={[styles.track, trackStyle]}>
      <View style={[styles.fill, { width: fillWidth }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    height: 9,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.pill,
    height: '100%',
  },
});
