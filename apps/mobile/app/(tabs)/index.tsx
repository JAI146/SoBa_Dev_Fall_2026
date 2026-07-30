import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { DecorativeBlob } from '@/components/DecorativeBlob';
import { ProgressBar } from '@/components/ProgressBar';
import { SectionHeader } from '@/components/SectionHeader';
import { SmallWinItem } from '@/components/SmallWinItem';
import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const smallWins: { id: string; title: string; time: string; icon: IoniconName }[] = [
  { id: 'save', title: 'Move $5 to your cushion', time: '2 min', icon: 'wallet-outline' },
  { id: 'review', title: 'Review one spending choice', time: '3 min', icon: 'search-outline' },
  { id: 'reflect', title: 'Write today’s reflection', time: '2 min', icon: 'pencil-outline' },
];

const moods = ['😔', '😕', '😌', '🙂', '🌟'];
const week = [
  { day: 'M', done: true },
  { day: 'T', done: true },
  { day: 'W', done: true },
  { day: 'T', done: true },
  { day: 'F', done: false },
  { day: 'S', done: false },
  { day: 'S', done: false },
];

export default function HomeScreen() {
  const [completedWins, setCompletedWins] = useState<Record<string, boolean>>({});
  const [selectedMood, setSelectedMood] = useState<string>();
  const [notificationSeen, setNotificationSeen] = useState(false);

  const toggleWin = (id: string) => {
    setCompletedWins((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>Good morning, Maya</Text>
          <Text style={styles.headerMessage}>Every small step is building something meaningful.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => setNotificationSeen(true)}
            style={styles.headerButton}>
            <Ionicons color={theme.colors.deepGreen} name="notifications-outline" size={22} />
            {!notificationSeen ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Open Maya's profile"
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}>
            <Text style={styles.avatarText}>MA</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroCard}>
        <DecorativeBlob style={styles.heroMintBlob} />
        <DecorativeBlob style={styles.heroCoralBlob} />
        <DecorativeBlob style={styles.heroOutlineBlob} />
        <View style={styles.heroContent}>
          <Text style={styles.eyebrow}>THIS WEEK’S PURPOSE</Text>
          <Text style={styles.heroTitle}>Build a little more breathing room</Text>
          <Text style={styles.heroText}>You’re making progress toward your emergency cushion.</Text>
          <View style={styles.progressCopy}>
            <Text style={styles.progressAmount}>$340 of $500</Text>
            <Text style={styles.progressPercent}>68%</Text>
          </View>
          <ProgressBar
            fillStyle={styles.heroProgressFill}
            progress={0.68}
            trackStyle={styles.heroProgressTrack}
          />
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/goals')}
            style={styles.heroButton}>
            <Text style={styles.heroButtonText}>View goal</Text>
            <Ionicons color={theme.colors.deepGreen} name="arrow-forward" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader detail="3 actions" title="Today’s small wins" />
        <View style={styles.list}>
          {smallWins.map((win) => (
            <SmallWinItem
              completed={Boolean(completedWins[win.id])}
              icon={win.icon}
              key={win.id}
              onToggle={() => toggleWin(win.id)}
              time={win.time}
              title={win.title}
            />
          ))}
        </View>
      </View>

      <View style={styles.purposeCard}>
        <View style={styles.purposeIcon}>
          <Ionicons color={theme.colors.deepGreen} name="git-network-outline" size={24} />
        </View>
        <Text style={styles.cardTitle}>Your PurposeMap</Text>
        <View style={styles.chipsWrap}>
          <View style={styles.connector} />
          {['Security', 'Family', 'Freedom'].map((value, index) => (
            <View key={value} style={[styles.valueChip, index === 1 && styles.familyChip]}>
              <Text style={styles.valueText}>{value}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.cardBody}>
          Your current goals are connected to the values that matter most to you.
        </Text>
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/goals')}
          style={styles.textLink}>
          <Text style={styles.textLinkLabel}>Explore PurposeMap</Text>
          <Ionicons color={theme.colors.deepGreen} name="arrow-forward" size={17} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekCard}>
        <View style={styles.weekTitleRow}>
          <View>
            <Text style={styles.cardTitle}>Weekly rhythm</Text>
            <Text style={styles.streak}>4-day streak</Text>
          </View>
          <View style={styles.flameIcon}>
            <Ionicons color={theme.colors.coral} name="flame" size={25} />
          </View>
        </View>
        <View style={styles.daysRow}>
          {week.map((item, index) => (
            <View key={`${item.day}-${index}`} style={styles.dayColumn}>
              <View style={[styles.dayDot, item.done && styles.dayDotDone]}>
                {item.done ? (
                  <Ionicons color={theme.colors.white} name="checkmark" size={16} />
                ) : (
                  <View style={styles.dayEmpty} />
                )}
              </View>
              <Text style={styles.dayText}>{item.day}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.weekMessage}>Consistency matters more than perfection.</Text>
      </View>

      <View style={styles.reflectionCard}>
        <View style={styles.reflectionHeading}>
          <View style={styles.reflectionIcon}>
            <Ionicons color={theme.colors.deepGreen} name="heart-outline" size={22} />
          </View>
          <Text style={styles.cardTitle}>How are you feeling today?</Text>
        </View>
        <View style={styles.moodRow}>
          {moods.map((mood) => {
            const isSelected = selectedMood === mood;
            return (
              <Pressable
                accessibilityLabel={`Select mood ${mood}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={mood}
                onPress={() => setSelectedMood(mood)}
                style={[styles.moodButton, isSelected && styles.moodButtonSelected]}>
                <Text style={styles.mood}>{mood}</Text>
              </Pressable>
            );
          })}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={() => router.push('/(tabs)/journal')}
          style={styles.reflectionButton}>
          <Text style={styles.reflectionButtonText}>Add reflection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.badgeCard}>
        <View style={styles.badgeVisual}>
          <View style={styles.badgeInner}>
            <Ionicons color={theme.colors.deepGreen} name="sparkles" size={25} />
          </View>
        </View>
        <View style={styles.badgeCopy}>
          <Text style={styles.badgeEyebrow}>ALMOST YOURS</Text>
          <Text style={styles.badgeTitle}>Small Wins Starter</Text>
          <Text style={styles.badgeBody}>Complete one more action to unlock this badge.</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  greeting: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  headerMessage: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.xxs,
    maxWidth: 280,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  notificationDot: {
    backgroundColor: theme.colors.coral,
    borderColor: theme.colors.white,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 9,
    top: 8,
    width: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroCard: {
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.xl,
    minHeight: 370,
    overflow: 'hidden',
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  heroContent: {
    flex: 1,
    maxWidth: 330,
    zIndex: 1,
  },
  eyebrow: {
    color: theme.colors.mint,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 38,
    marginTop: theme.spacing.sm,
    maxWidth: 300,
  },
  heroText: {
    color: '#D9ECE7',
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
    maxWidth: 280,
  },
  progressCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  progressAmount: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  progressPercent: {
    color: theme.colors.mint,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroProgressTrack: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroProgressFill: {
    backgroundColor: theme.colors.mint,
  },
  heroButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 50,
    paddingHorizontal: theme.spacing.lg,
  },
  heroButtonText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  heroMintBlob: {
    backgroundColor: 'rgba(158,223,203,0.22)',
    height: 230,
    right: -84,
    top: -48,
    width: 230,
  },
  heroCoralBlob: {
    backgroundColor: theme.colors.coral,
    bottom: -52,
    height: 150,
    opacity: 0.9,
    right: -24,
    width: 150,
  },
  heroOutlineBlob: {
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 24,
    bottom: -60,
    height: 190,
    left: -92,
    width: 190,
  },
  section: {
    gap: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.sm,
  },
  purposeCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  purposeIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 48,
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    width: 48,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  chipsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.lg,
    position: 'relative',
  },
  connector: {
    backgroundColor: theme.colors.mint,
    height: 2,
    left: '12%',
    position: 'absolute',
    right: '12%',
    top: 20,
  },
  valueChip: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.mint,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm,
    zIndex: 1,
  },
  familyChip: {
    backgroundColor: theme.colors.lightCoral,
    borderColor: theme.colors.coral,
  },
  valueText: {
    color: theme.colors.darkGreenText,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  cardBody: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
  },
  textLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    minHeight: 44,
  },
  textLinkLabel: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  weekCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  weekTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streak: {
    color: theme.colors.coral,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
    marginTop: theme.spacing.xxs,
  },
  flameIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightCoral,
    borderRadius: theme.radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  dayColumn: {
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  dayDot: {
    alignItems: 'center',
    backgroundColor: theme.colors.graphite,
    borderRadius: theme.radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dayDotDone: {
    backgroundColor: theme.colors.deepGreen,
  },
  dayEmpty: {
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  dayText: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '700',
  },
  weekMessage: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  reflectionCard: {
    backgroundColor: theme.colors.lavender,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  reflectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  reflectionIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.lg,
  },
  moodButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'transparent',
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  moodButtonSelected: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.deepGreen,
  },
  mood: {
    fontSize: 23,
  },
  reflectionButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    minHeight: 50,
  },
  reflectionButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  badgeCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  badgeVisual: {
    alignItems: 'center',
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    height: 70,
    justifyContent: 'center',
    width: 70,
  },
  badgeInner: {
    alignItems: 'center',
    backgroundColor: theme.colors.paleGold,
    borderRadius: theme.radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  badgeCopy: {
    flex: 1,
  },
  badgeEyebrow: {
    color: '#826314',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  badgeTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
    marginTop: 3,
  },
  badgeBody: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});
