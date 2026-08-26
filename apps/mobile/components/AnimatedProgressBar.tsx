import { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { theme } from '@/constants/theme';

type AnimatedProgressBarProps = {
  progress: number;
  fillStyle?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
};

export function AnimatedProgressBar({
  progress,
  fillStyle,
  trackStyle,
}: AnimatedProgressBarProps) {
  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const animatedProgress = useSharedValue(0);
  const trackWidth = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(normalizedProgress, { duration: 360 });
  }, [animatedProgress, normalizedProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * animatedProgress.value,
  }));

  return (
    <View
      accessibilityLabel={`${Math.round(normalizedProgress * 100)} percent complete`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(normalizedProgress * 100) }}
      onLayout={(event) => {
        trackWidth.value = event.nativeEvent.layout.width;
      }}
      style={[styles.track, trackStyle]}>
      <Animated.View style={[styles.fill, animatedStyle, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: theme.colors.teal,
    borderRadius: theme.radius.pill,
    height: '100%',
  },
});
