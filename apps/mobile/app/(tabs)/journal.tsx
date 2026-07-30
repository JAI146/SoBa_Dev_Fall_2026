import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { theme } from '@/constants/theme';

export default function JournalScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>A MOMENT FOR YOU</Text>
        <Text style={styles.title}>Reflections</Text>
        <Text style={styles.subtitle}>Notice what’s working, without judging what isn’t.</Text>
      </View>

      <View style={styles.promptCard}>
        <View style={styles.promptTopRow}>
          <View style={styles.promptIcon}>
            <Ionicons color={theme.colors.deepGreen} name="chatbubble-ellipses-outline" size={26} />
          </View>
          <Text style={styles.promptLabel}>TODAY’S PROMPT</Text>
        </View>
        <Text style={styles.prompt}>What small choice made you feel more secure today?</Text>
        <View style={styles.promptHint}>
          <Ionicons color={theme.colors.mutedText} name="time-outline" size={17} />
          <Text style={styles.promptHintText}>Take two quiet minutes</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>A recent reflection</Text>
        <Text style={styles.date}>Yesterday</Text>
      </View>

      <View style={styles.previousCard}>
        <View style={styles.moodBadge}>
          <Text style={styles.mood}>🙂</Text>
        </View>
        <Text style={styles.previousText}>
          I paused before ordering takeout and made something simple at home. It felt good to choose my cushion goal without feeling deprived.
        </Text>
        <View style={styles.valueTag}>
          <Ionicons color={theme.colors.deepGreen} name="shield-checkmark-outline" size={15} />
          <Text style={styles.valueTagText}>Connected to Security</Text>
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
  },
  promptCard: {
    backgroundColor: theme.colors.lavender,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  promptTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  promptIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  promptLabel: {
    color: theme.colors.deepGreen,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  prompt: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: theme.spacing.lg,
  },
  promptHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  promptHintText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  date: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  previousCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    marginTop: -theme.spacing.md,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  moodBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  mood: {
    fontSize: 23,
  },
  previousText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 25,
    marginTop: theme.spacing.md,
  },
  valueTag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xxs,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  valueTagText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
});
