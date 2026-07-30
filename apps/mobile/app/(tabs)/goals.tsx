import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { ProgressBar } from '@/components/ProgressBar';
import { theme } from '@/constants/theme';

export default function GoalsScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>YOUR NEXT CHAPTER</Text>
        <Text style={styles.title}>Your goals</Text>
        <Text style={styles.subtitle}>Realistic targets, connected to the life you want to build.</Text>
      </View>

      <View style={styles.goalCard}>
        <View style={styles.goalTopRow}>
          <View style={styles.goalIcon}>
            <Ionicons color={theme.colors.deepGreen} name="umbrella-outline" size={26} />
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>
        <Text style={styles.goalTitle}>Emergency cushion</Text>
        <Text style={styles.goalDescription}>A little space for the moments you can’t plan for.</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>$340</Text>
          <Text style={styles.target}>of $500</Text>
        </View>
        <ProgressBar progress={0.68} />
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons color={theme.colors.mutedText} name="calendar-outline" size={16} />
            <Text style={styles.metaText}>8 weeks left</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons color={theme.colors.mutedText} name="heart-outline" size={16} />
            <Text style={styles.metaText}>Security</Text>
          </View>
        </View>
      </View>

      <View style={styles.upcomingCard}>
        <View style={styles.upcomingIcon}>
          <Ionicons color={theme.colors.coral} name="sparkles-outline" size={25} />
        </View>
        <View style={styles.upcomingCopy}>
          <Text style={styles.upcomingTitle}>More goal tools are growing</Text>
          <Text style={styles.upcomingText}>
            Soon you’ll be able to add milestones, connect habits, and celebrate each micro-win.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  eyebrow: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.xs,
    maxWidth: 330,
  },
  goalCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
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
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  activePill: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  activeText: {
    color: theme.colors.deepGreen,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: theme.spacing.lg,
  },
  goalDescription: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.xs,
  },
  amountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  amount: {
    color: theme.colors.deepGreen,
    fontSize: 28,
    fontWeight: '900',
  },
  target: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xxs,
  },
  metaText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  upcomingCard: {
    backgroundColor: theme.colors.lightCoral,
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  upcomingIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  upcomingCopy: {
    flex: 1,
  },
  upcomingTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  upcomingText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
});
