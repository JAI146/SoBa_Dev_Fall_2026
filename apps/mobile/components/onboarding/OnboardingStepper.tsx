import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const STEPS = ['What matters', 'Your goal', 'Your habit', 'Dashboard'] as const;

function activeIndexForPath(pathname: string): number {
  if (pathname.includes('values')) return 0;
  if (pathname.includes('purpose-map')) return 1;
  if (pathname.includes('habits')) return 2;
  return -1;
}

export function OnboardingStepper() {
  const pathname = usePathname();
  const activeIndex = activeIndexForPath(pathname);

  return (
    <View accessibilityRole="progressbar" style={styles.row}>
      {STEPS.map((label, index) => {
        const isComplete = activeIndex > index;
        const isActive = activeIndex === index;
        return (
          <View key={label} style={styles.step}>
            <View
              style={[
                styles.badge,
                isActive && styles.badgeActive,
                isComplete && styles.badgeComplete,
              ]}>
              {isComplete ? (
                <Ionicons color={theme.colors.white} name="checkmark" size={14} />
              ) : (
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.label,
                (isActive || isComplete) && styles.labelActive,
              ]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  step: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.xxs,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: theme.colors.graphite,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  badgeActive: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.deepGreen,
  },
  badgeComplete: {
    backgroundColor: theme.colors.deepGreen,
    borderColor: theme.colors.deepGreen,
  },
  badgeText: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: theme.colors.deepGreen,
  },
  label: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelActive: {
    color: theme.colors.text,
  },
});
