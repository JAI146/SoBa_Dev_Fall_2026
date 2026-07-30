import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DecorativeBlob } from '@/components/DecorativeBlob';
import { PurposeMintLogo } from '@/components/PurposeMintLogo';
import { theme } from '@/constants/theme';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DecorativeBlob style={styles.topBlob} />
      <DecorativeBlob style={styles.bottomBlob} />
      <View style={styles.content}>
        <View style={styles.logoHalo}>
          <PurposeMintLogo size={70} />
        </View>
        <Text style={styles.tagline}>Small steps. Meaningful progress.</Text>
        <ActivityIndicator color={theme.colors.deepGreen} size="small" style={styles.loader} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.cream,
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  logoHalo: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    height: 142,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
    ...theme.shadows.card,
  },
  tagline: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.md,
    lineHeight: 23,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  topBlob: {
    backgroundColor: theme.colors.lightMint,
    height: 220,
    right: -96,
    top: -72,
    width: 220,
  },
  bottomBlob: {
    backgroundColor: theme.colors.lavender,
    bottom: -110,
    height: 260,
    left: -110,
    width: 260,
  },
});
