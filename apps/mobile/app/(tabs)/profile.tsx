import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { PurposeMintLogo } from '@/components/PurposeMintLogo';
import { theme } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const settings: { icon: IoniconName; label: string; value: string }[] = [
  { icon: 'person-outline', label: 'Personal details', value: 'Maya Anderson' },
  { icon: 'notifications-outline', label: 'Reminders', value: 'Gentle nudges on' },
  { icon: 'shield-checkmark-outline', label: 'Privacy', value: 'Review settings' },
  { icon: 'help-circle-outline', label: 'Support', value: 'How can we help?' },
];

export default function ProfileScreen() {
  return (
    <AppScreen contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.logoWrap}>
          <PurposeMintLogo size={44} />
        </View>
        <Text style={styles.name}>Maya Anderson</Text>
        <View style={styles.planPill}>
          <Text style={styles.planText}>Free plan</Text>
        </View>
        <Text style={styles.profileMessage}>Your progress belongs to you. Keep going at your own pace.</Text>
      </View>

      <View style={styles.settingsCard}>
        {settings.map((setting, index) => (
          <View
            key={setting.label}
            style={[styles.settingRow, index < settings.length - 1 && styles.settingDivider]}>
            <View style={styles.settingIcon}>
              <Ionicons color={theme.colors.deepGreen} name={setting.icon} size={21} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>{setting.label}</Text>
              <Text style={styles.settingValue}>{setting.value}</Text>
            </View>
            <Ionicons color={theme.colors.disabled} name="chevron-forward" size={19} />
          </View>
        ))}
      </View>

      <AppButton
        accessibilityLabel="Log out of PurposeMint"
        onPress={() => router.replace('/(auth)/login')}
        title="Log out"
        variant="outline"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
  },
  logoWrap: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    height: 84,
    justifyContent: 'center',
    width: 210,
    ...theme.shadows.card,
  },
  name: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: theme.spacing.md,
  },
  planPill: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.pill,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  planText: {
    color: theme.colors.deepGreen,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  profileMessage: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 21,
    marginTop: theme.spacing.md,
    maxWidth: 300,
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 76,
  },
  settingDivider: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
  },
  settingIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  settingCopy: {
    flex: 1,
  },
  settingLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  settingValue: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    marginTop: 3,
  },
});
