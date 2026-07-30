import { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

import { DecorativeBlob } from './DecorativeBlob';
import { PurposeMintLogo } from './PurposeMintLogo';

type AuthScaffoldProps = PropsWithChildren<{
  heroTitle: string;
  heroText: string;
}>;

export function AuthScaffold({ children, heroTitle, heroText }: AuthScaffoldProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <DecorativeBlob style={styles.mintBlob} />
            <DecorativeBlob style={styles.coralBlob} />
            <DecorativeBlob style={styles.lavenderBlob} />
            <PurposeMintLogo />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{heroTitle}</Text>
              <Text style={styles.heroText}>{heroText}</Text>
            </View>
          </View>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.lightMint,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    backgroundColor: theme.colors.cream,
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    backgroundColor: theme.colors.lightMint,
    minHeight: 340,
    overflow: 'hidden',
    paddingBottom: 88,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  heroCopy: {
    maxWidth: 330,
    paddingTop: theme.spacing.xl,
  },
  heroTitle: {
    color: theme.colors.darkGreenText,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 41,
  },
  heroText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.sm,
    maxWidth: 300,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: -44,
    maxWidth: 520,
    padding: theme.spacing.lg,
    width: '90%',
    ...theme.shadows.card,
  },
  mintBlob: {
    backgroundColor: 'rgba(194, 10, 114, 0.12)',
    height: 190,
    right: -50,
    top: 54,
    transform: [{ rotate: '-18deg' }],
    width: 120,
  },
  coralBlob: {
    backgroundColor: 'rgba(243, 207, 24, 0.30)',
    height: 86,
    right: 42,
    top: -34,
    width: 86,
  },
  lavenderBlob: {
    backgroundColor: 'rgba(87, 16, 111, 0.10)',
    bottom: -42,
    height: 120,
    left: -34,
    width: 120,
  },
});
