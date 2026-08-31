import { Ionicons } from '@expo/vector-icons';
import { OnboardingStatus, Tier } from '@purposemint/contracts';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { ChangeGoalModal } from '@/components/dashboard/ChangeGoalModal';
import {
  CommunityChallengeCard,
  PathwayProgressCard,
  ReflectionJourneyCard,
  WaysToSaveCard,
} from '@/components/dashboard/DashboardSections';
import { LogSavingsModal } from '@/components/dashboard/LogSavingsModal';
import { MoodCheckInModal } from '@/components/reflections/MoodCheckInModal';
import { HabitCheckCard } from '@/components/HabitCheckCard';
import { QueryErrorState } from '@/components/QueryErrorState';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/use-dashboard';
import { postAuthHref } from '@/lib/auth/post-auth-href';
import { formatUsdExact } from '@/lib/format/money';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TOOLS: {
  title: string;
  sub: string;
  state: 'display' | 'functional' | 'locked';
  requires: 'none' | 'momentum' | 'elevation';
  icon: IoniconName;
}[] = [
  {
    title: 'Daily check-in',
    sub: 'How are you feeling?',
    state: 'functional',
    requires: 'none',
    icon: 'sunny-outline',
  },
  {
    title: 'Month in review',
    sub: 'See your recap',
    state: 'display',
    requires: 'none',
    icon: 'calendar-outline',
  },
  {
    title: 'Pause my plan',
    sub: 'Life happens',
    state: 'display',
    requires: 'none',
    icon: 'pause-outline',
  },
  {
    title: 'Log savings by hand',
    sub: 'Free manual tracking',
    state: 'functional',
    requires: 'none',
    icon: 'pencil-outline',
  },
  {
    title: 'Open an account',
    sub: 'Momentum opens a partner-bank account',
    state: 'locked',
    requires: 'momentum',
    icon: 'wallet-outline',
  },
  {
    title: 'Level 5: Pathways',
    sub: 'Elevation unlocks car, home, or training',
    state: 'locked',
    requires: 'elevation',
    icon: 'map-outline',
  },
  {
    title: 'How your money works',
    sub: 'Fees, partners, support, closing your account',
    state: 'display',
    requires: 'none',
    icon: 'information-circle-outline',
  },
];

export default function DashboardScreen() {
  const { session } = useAuth();
  const {
    completeHabit,
    createGoal,
    data,
    error,
    isError,
    isLoading,
    logSavings,
    loggingSavings,
    refetch,
    setFocusGoal,
  } = useDashboard();
  const [logOpen, setLogOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [pathwaysLockedOpen, setPathwaysLockedOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);

  if (!session || session.user.onboardingStatus !== OnboardingStatus.COMPLETED) {
    return <Redirect href={postAuthHref(session?.user)} />;
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <QueryErrorState
          message={error instanceof Error ? error.message : 'Please try again.'}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.deepGreen} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const focus = data.focusGoal;
  const headline = data.primaryValue?.headlineWord;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>{data.displayName}'s Dashboard</Text>
        <Text style={styles.sub}>
          You're building toward{' '}
          {headline ? (
            <Text style={styles.headlineWord}>{headline}</Text>
          ) : (
            <Text style={styles.headlineWord}>what matters</Text>
          )}
          .
        </Text>

        <View style={styles.pills}>
          <QuickPill label="Update Goals" onPress={() => setChangeOpen(true)} />
          <QuickPill label="Update Habits" onPress={() => router.push('/manage-habits')} />
          <QuickPill label="Edit Values" onPress={() => router.push('/edit-values')} />
        </View>

        <View style={styles.card}>
          {focus ? (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>
                  Progress: {focus.progressPercent}% towards {formatUsdExact(focus.targetAmount)}
                </Text>
                <Text style={styles.savedHero}>{formatUsdExact(focus.savedAmount)}</Text>
              </View>
              <AnimatedProgressBar progress={focus.progressPercent / 100} />
              <Text style={styles.muted}>
                {formatUsdExact(focus.savedAmount)} saved · {formatUsdExact(focus.remainingAmount)} left to
                reach your {formatUsdExact(focus.targetAmount)} goal
              </Text>
              <Text style={styles.italic}>
                You log these amounts yourself on Starter. Nothing is withdrawn from a bank
                account.
              </Text>
              <View style={styles.currentGoal}>
                <Text style={styles.goalEmoji}>{focus.iconEmoji}</Text>
                <View style={styles.flex}>
                  <Text style={styles.goalTitle}>{focus.title}</Text>
                  <Text style={styles.currentLabel}>Current Goal</Text>
                </View>
                <Pressable
                  accessibilityLabel="Change"
                  accessibilityRole="button"
                  onPress={() => setChangeOpen(true)}
                  style={styles.changeButton}>
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Progress: start when you're ready</Text>
              <AnimatedProgressBar progress={0} />
              <Text style={styles.italic}>
                Start with habits for now. When you're ready, pick a savings goal and log what you
                set aside.
              </Text>
            </>
          )}
        </View>

        <CommunityChallengeCard challenge={data.communityChallenge} />

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Today's Habits</Text>
            <Pressable accessibilityLabel="Edit Habits" accessibilityRole="button" onPress={() => router.push('/manage-habits')} style={styles.changeButton}><Text style={styles.changeText}>Edit Habits</Text></Pressable>
          </View>
          {data.habits.map((habit) => (
            <HabitCheckCard
              completedToday={habit.completedToday}
              description={habit.description}
              iconEmoji={habit.iconEmoji}
              key={habit.id}
              onToggle={() => completeHabit(habit.id)}
              title={habit.title}
            />
          ))}
          <Pressable
            accessibilityLabel="Log $5 you saved"
            accessibilityRole="button"
            onPress={() => setLogOpen(true)}
            style={styles.logSavings}>
            <Text style={styles.logSavingsTitle}>Log $5 you saved</Text>
            <Text style={styles.logSavingsSub}>
              Manual entry — no money moves in or out of any bank
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Log your mood. How are you feeling today?"
            accessibilityRole="button"
            onPress={() => setMoodOpen(true)}
            style={styles.logMood}
          >
            <View style={styles.flex}>
              <Text style={styles.logMoodTitle}>Log your mood</Text>
              <Text style={styles.logMoodSub}>How are you feeling today?</Text>
            </View>
            <Ionicons
              color={theme.colors.mutedText}
              name="chevron-forward"
              size={18}
            />
          </Pressable>
        </View>

        <ReflectionJourneyCard reflection={data.reflection} />
        <WaysToSaveCard />
        <PathwayProgressCard items={data.pathwayProgress} />

        <View style={styles.card}>
          <Text style={styles.toolsEyebrow}>YOUR TOOLS</Text>
          <Text style={styles.muted}>
            You're on Starter (free): build the habit and log what you save by hand. Momentum opens
            your PurposeMint account so saving happens automatically. Elevation unlocks Level 5
            Pathways.
          </Text>
          <View style={styles.toolsGrid}>
            {TOOLS.map((tool) => {
              const hasMomentum =
                data.user.tier === Tier.GROWTH || data.user.tier === Tier.ELEVATE;
              const hasElevation = data.user.tier === Tier.ELEVATE;
              const locked =
                (tool.requires === 'momentum' && !hasMomentum) ||
                (tool.requires === 'elevation' && !hasElevation);
              const onPress =
                tool.title === 'Daily check-in'
                  ? () => setMoodOpen(true)
                  : tool.title === 'Log savings by hand'
                    ? () => setLogOpen(true)
                    : undefined;
              return (
                <Pressable
                  accessibilityLabel={locked ? `${tool.title}. Locked` : tool.title}
                  accessibilityRole={onPress ? 'button' : 'text'}
                  accessibilityState={locked ? { disabled: true } : undefined}
                  disabled={locked || !onPress}
                  key={tool.title}
                  onPress={onPress}
                  style={[styles.toolCard, locked && styles.toolLocked]}>
                  <View style={styles.toolHeader}>
                    <Ionicons color={theme.colors.deepGreen} name={tool.icon} size={18} />
                    {locked ? (
                      <Ionicons color={theme.colors.deepGreen} name="lock-closed" size={14} />
                    ) : null}
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolSub}>{tool.sub}</Text>
                </Pressable>
              );
            })}
          </View>
          <View
            accessibilityLabel="See More Tools. Monthly reflections, planners, coaching & more"
            accessibilityRole="text"
            style={styles.moreTools}>
            <Text style={styles.moreToolsTitle}>See More Tools</Text>
            <Text style={styles.muted}>Monthly reflections, planners, coaching & more</Text>
          </View>
          <View
            accessibilityLabel="Lead Challenges for Your Community. Open the Community Challenge Board and save alongside your group"
            accessibilityRole="text"
            style={styles.leadChallenges}>
            <Text style={styles.leadTitle}>Lead Challenges for Your Community</Text>
            <Text style={styles.muted}>
              Open the Community Challenge Board and save alongside your group
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.flex}>
          <Text style={styles.footerTitle}>Level 5: Pathways</Text>
          <Text style={styles.footerSub}>
            Turn what you've saved into a car, a home, childcare, or training.
          </Text>
        </View>
        <Pressable
          accessibilityLabel={data.user.tier === Tier.ELEVATE ? 'Unlock Pathways' : 'Unlock Pathways. Requires Elevation'}
          accessibilityRole="button"
          onPress={() => data.user.tier === Tier.ELEVATE ? router.push('/(pathways)') : setPathwaysLockedOpen(true)}
          style={styles.unlockButton}>
          <Ionicons color={theme.colors.white} name="lock-closed" size={14} />
          <Text style={styles.unlockText}>Unlock Pathways</Text>
        </Pressable>
      </View>

      <Modal animationType="fade" onRequestClose={() => setPathwaysLockedOpen(false)} transparent visible={pathwaysLockedOpen}>
        <View style={styles.modalOverlay}><Pressable accessibilityLabel="Close Pathways membership information" accessibilityRole="button" onPress={() => setPathwaysLockedOpen(false)} style={styles.modalBackdrop}/><View style={styles.lockedModal}><Ionicons color={theme.colors.deepGreen} name="lock-closed" size={28}/><Text style={styles.modalTitle}>Pathways requires Elevation</Text><Text style={styles.muted}>Your Starter membership keeps Pathways locked. Elevation unlocks readiness verification and partner matching for major life goals.</Text><Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={() => setPathwaysLockedOpen(false)} style={styles.modalClose}><Text style={styles.unlockText}>Close</Text></Pressable></View></View>
      </Modal>

      <LogSavingsModal
        goalTitle={focus?.title ?? null}
        onClose={() => setLogOpen(false)}
        onSave={async (amount, note) => {
          if (!focus) return;
          await logSavings({ goalId: focus.id, amount, note });
        }}
        saving={loggingSavings}
        visible={logOpen}
      />
      <ChangeGoalModal
        focusGoalId={focus?.id ?? null}
        goals={data.goals}
        onClose={() => setChangeOpen(false)}
        onCreate={createGoal}
        onSelect={setFocusGoal}
        visible={changeOpen}
      />
      <MoodCheckInModal onClose={() => setMoodOpen(false)} visible={moodOpen} />
    </SafeAreaView>
  );
}

function QuickPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.cream,
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: 24,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  sub: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    marginTop: -theme.spacing.xs,
  },
  headlineWord: {
    color: theme.colors.plum,
    fontWeight: '800',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  pill: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  pillText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
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
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
    paddingRight: theme.spacing.sm,
  },
  savedHero: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  muted: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  italic: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  currentGoal: {
    alignItems: 'center',
    backgroundColor: theme.colors.graphite,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  goalEmoji: {
    fontSize: 22,
  },
  flex: {
    flex: 1,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  currentLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  changeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  changeText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  logSavings: {
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.md,
    minHeight: 64,
    padding: theme.spacing.md,
  },
  logSavingsTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  logSavingsSub: {
    color: theme.colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  logMood: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    minHeight: 64,
    padding: theme.spacing.md,
  },
  logMoodTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  logMoodSub: {
    color: theme.colors.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  toolsEyebrow: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  toolCard: {
    backgroundColor: theme.colors.graphite,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    width: '48%',
  },
  toolLocked: {
    opacity: 0.85,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  toolTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  toolSub: {
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  moreTools: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    minHeight: 64,
    padding: theme.spacing.md,
  },
  moreToolsTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  leadChallenges: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    minHeight: 64,
    padding: theme.spacing.md,
  },
  leadTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  footerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  footerSub: {
    color: theme.colors.mutedText,
    fontSize: 11,
    lineHeight: 16,
  },
  unlockButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
  },
  unlockText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { backgroundColor: 'rgba(38, 22, 15, 0.35)', flex: 1 },
  lockedModal: { alignItems: 'center', backgroundColor: theme.colors.white, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, gap: theme.spacing.sm, padding: theme.spacing.xl, paddingBottom: 36 },
  modalTitle: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '900' },
  modalClose: { alignItems: 'center', backgroundColor: theme.colors.deepGreen, borderRadius: theme.radius.md, justifyContent: 'center', minHeight: 44, minWidth: 120, paddingHorizontal: theme.spacing.md },
});
