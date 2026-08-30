import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { theme } from '@/constants/theme';
import { formatUsd } from '@/lib/format/money';
import type {
  CommunityChallengePublic,
  PathwayProgressPublic,
  ReflectionJourneyPublic,
} from '@purposemint/contracts';

export function LockedRow({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View
      accessibilityLabel={`${title}. Locked`}
      accessibilityRole="text"
      style={styles.lockedRow}>
      <Ionicons color={theme.colors.deepGreen} name="lock-closed" size={16} />
      <View style={styles.lockedCopy}>
        <Text style={styles.lockedTitle}>{title}</Text>
        {subtitle ? <Text style={styles.lockedSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function CommunityChallengeCard({
  challenge,
}: {
  challenge: CommunityChallengePublic;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.sectionTitle}>Monthly Community Challenge</Text>
          <Text style={styles.muted}>{challenge.monthLabel}</Text>
        </View>
        <View style={styles.viewOnly}>
          <Text style={styles.viewOnlyText}>View Only</Text>
        </View>
      </View>
      <Text style={styles.challengeTitle}>{challenge.title}</Text>
      <Text style={styles.muted}>{challenge.description}</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.meta}>Community Progress</Text>
        <Text style={styles.meta}>{challenge.participantCount} participants</Text>
      </View>
      <AnimatedProgressBar progress={challenge.completedPercent / 100} />
      <Text style={styles.muted}>
        {challenge.completedPercent}% of participants completed this week!
      </Text>
      <LockedRow title="Upgrade to Momentum to join challenges" />
      <Text style={styles.footnote}>Free tier includes read-only access to 1 monthly challenge</Text>
    </View>
  );
}

export function ReflectionJourneyCard({
  reflection,
}: {
  reflection: ReflectionJourneyPublic;
}) {
  const hasStreak = reflection.streakDays > 0;
  const hasMood = reflection.averageMood !== null;
  const hasThemes = reflection.themes.length > 0;
  const hasRecent = reflection.recent.length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Your Reflection Journey</Text>

      <View style={styles.streakCard}>
        <Text style={styles.streakDays}>
          {hasStreak ? `${reflection.streakDays} days` : '0 days'}
        </Text>
        <Text style={styles.muted}>
          {reflection.voiceCount} voice · {reflection.textCount} text
        </Text>
        {!hasStreak ? (
          <Text style={styles.empty}>Your streak starts with the first reflection you log.</Text>
        ) : null}
      </View>

      <Text style={styles.subhead}>Mood Trend (7 days)</Text>
      <View style={styles.moodRow}>
        {reflection.moodTrend.map((day, index) => (
          <View key={`${day.weekday}-${index}`} style={styles.moodCol}>
            <View
              style={[
                styles.moodBar,
                { height: day.mood ? 12 + day.mood * 10 : 8 },
                !day.mood && styles.moodBarEmpty,
              ]}
            />
            <Text style={styles.moodDay}>{day.weekday}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.muted}>
        {hasMood
          ? `Average mood ${reflection.averageMood} / 5.0`
          : 'Average mood — / 5.0'}
      </Text>
      {!hasMood ? (
        <Text style={styles.empty}>Log how you feel to see your week at a glance.</Text>
      ) : null}

      <Text style={styles.subhead}>Recurring Themes</Text>
      {hasThemes ? (
        <View style={styles.chips}>
          {reflection.themes.map((themeItem) => (
            <View key={themeItem.label} style={styles.chip}>
              <Text style={styles.chipText}>
                {themeItem.label} ({themeItem.count})
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Themes will show up here as you reflect.</Text>
      )}

      <Text style={styles.subhead}>Recent Reflections</Text>
      {hasRecent ? (
        reflection.recent.map((item) => (
          <View key={item.id} style={styles.recentRow}>
            <Text style={styles.recentExcerpt}>{item.excerpt}</Text>
            <Text style={styles.muted}>{item.dateLabel}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No reflections yet. Your words will live here.</Text>
      )}
    </View>
  );
}

const WAYS_TO_SAVE = [
  {
    title: 'Envelope Method',
    body: 'Split your spending into labeled envelopes — groceries, transit, joy — so each dollar has a job before you spend it.',
  },
  {
    title: 'Separate Checking Account',
    body: "Keep spending money in one account and savings in another. What you don't see is harder to spend.",
  },
  {
    title: 'Round-Up Your Change',
    body: 'Round each purchase up to the next dollar and set the spare change aside. Small leftovers add up.',
  },
] as const;

export function WaysToSaveCard() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Ways to Save (Free)</Text>
      {WAYS_TO_SAVE.map((item) => {
        const expanded = open === item.title;
        return (
          <View key={item.title} style={styles.accordion}>
            <Pressable
              accessibilityLabel={item.title}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : item.title)}
              style={styles.accordionHeader}>
              <Text style={styles.accordionTitle}>{item.title}</Text>
              <Ionicons
                color={theme.colors.mutedText}
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
              />
            </Pressable>
            {expanded ? <Text style={styles.accordionBody}>{item.body}</Text> : null}
          </View>
        );
      })}
      <LockedRow
        title="Want automatic savings?"
        subtitle="Upgrade to Momentum for automatic transfers into a partner-bank account"
      />
    </View>
  );
}

export function PathwayProgressCard({
  items,
}: {
  items: PathwayProgressPublic[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Pathway Progress</Text>
      <Text style={styles.muted}>Track how your savings bring you closer to life transitions</Text>
      {items.map((item) => (
        <View key={item.key} style={styles.pathwayRow}>
          <Text style={styles.pathwayLabel}>{item.label}</Text>
          <Text style={styles.pathwayAmount}>
            {formatUsd(item.savedAmount)} / {formatUsd(item.targetAmount)}
          </Text>
        </View>
      ))}
      <LockedRow title="Level 5: Pathways — included with Elevation" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  muted: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  viewOnly: {
    backgroundColor: theme.colors.lavender,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  viewOnlyText: {
    color: theme.colors.plum,
    fontSize: 11,
    fontWeight: '800',
  },
  challengeTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  footnote: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
  lockedRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  lockedCopy: {
    flex: 1,
  },
  lockedTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  lockedSub: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  streakCard: {
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  streakDays: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  empty: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  subhead: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
    marginTop: theme.spacing.xs,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodCol: {
    alignItems: 'center',
    gap: 4,
  },
  moodBar: {
    backgroundColor: theme.colors.teal,
    borderRadius: 4,
    width: 14,
  },
  moodBarEmpty: {
    backgroundColor: theme.colors.border,
  },
  moodDay: {
    color: theme.colors.mutedText,
    fontSize: 10,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    backgroundColor: theme.colors.lavender,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  recentRow: {
    gap: 2,
  },
  recentExcerpt: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
  },
  accordion: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  accordionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  accordionBody: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  pathwayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  pathwayLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  pathwayAmount: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
});
