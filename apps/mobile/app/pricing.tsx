import { Ionicons } from '@expo/vector-icons';
import {
  OnboardingStatus,
  Tier,
  type SubscriptionPlanPublic,
  type UpgradeIntentResponse,
} from '@purposemint/contracts';
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
import { AppButton } from '@/components/AppButton';
import { FormNotice } from '@/components/FormNotice';
import { QueryErrorState } from '@/components/QueryErrorState';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSubscriptionPlans,
  useUpgradeIntent,
} from '@/hooks/use-subscriptions';
import { postAuthHref } from '@/lib/auth/post-auth-href';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function PricingScreen() {
  const { session } = useAuth();
  const plansQuery = useSubscriptionPlans();
  const upgrade = useUpgradeIntent();
  const [acknowledgement, setAcknowledgement] =
    useState<UpgradeIntentResponse | null>(null);
  const [pathwaysNoteOpen, setPathwaysNoteOpen] = useState(false);
  const [error, setError] = useState<{
    planKey: SubscriptionPlanPublic['key'];
    message: string;
  } | null>(null);

  if (!session) return <Redirect href="/(auth)/login" />;
  if (session.user.onboardingStatus !== OnboardingStatus.COMPLETED) {
    return <Redirect href={postAuthHref(session.user)} />;
  }
  if (plansQuery.isError) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <QueryErrorState
          message={
            plansQuery.error instanceof Error
              ? plansQuery.error.message
              : 'Membership plans could not be loaded.'
          }
          onRetry={() => void plansQuery.refetch()}
        />
      </SafeAreaView>
    );
  }
  if (plansQuery.isLoading || !plansQuery.data) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.deepGreen} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const { currentPlanKey, plans } = plansQuery.data;
  const currentSortOrder =
    plans.find((plan) => plan.key === currentPlanKey)?.sortOrder ?? 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Back to dashboard"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons color={theme.colors.text} name="arrow-back" size={20} />
          <Text style={styles.backText}>Back to dashboard</Text>
        </Pressable>

        <Text style={styles.heading}>
          Save your next $500—without stress, shame, or starting over.
        </Text>
        <Text style={styles.subheading}>
          PurposeMint helps you build real savings habits for real life—so you
          can stop living paycheck to paycheck and start building stability.
        </Text>

        <View style={styles.planList}>
          {plans.map((plan) => {
            const current = plan.key === currentPlanKey;
            const included = plan.sortOrder < currentSortOrder;
            const canUpgrade = plan.sortOrder > currentSortOrder;
            return (
              <PlanCard
                current={current}
                error={error?.planKey === plan.key ? error.message : undefined}
                included={included}
                key={plan.key}
                loading={
                  upgrade.isPending && upgrade.variables?.planKey === plan.key
                }
                onUpgrade={
                  canUpgrade
                    ? () => {
                        setError(null);
                        void upgrade
                          .mutateAsync({ planKey: plan.key })
                          .then(setAcknowledgement)
                          .catch((reason: unknown) =>
                            setError({
                              planKey: plan.key,
                              message:
                                reason instanceof Error
                                  ? reason.message
                                  : 'Your interest could not be saved. Please try again.',
                            }),
                          );
                      }
                    : undefined
                }
                plan={plan}
              />
            );
          })}
        </View>

        <View style={styles.pathwaysCard}>
          <View style={styles.pathwaysIcon}>
            <Ionicons
              color={theme.colors.teal}
              name="location-outline"
              size={24}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.pathwaysTitle}>Ready for a bigger goal?</Text>
            <Text style={styles.pathwaysBody}>
              Level 5 Pathways: car, housing, childcare, or training
            </Text>
          </View>
          <Pressable
            accessibilityLabel="View Pathways"
            accessibilityRole="button"
            onPress={() =>
              currentPlanKey === Tier.ELEVATE
                ? router.push('/(pathways)')
                : setPathwaysNoteOpen(true)
            }
            style={styles.pathwaysButton}
          >
            <Text style={styles.pathwaysButtonText}>View Pathways</Text>
            <Ionicons
              color={theme.colors.deepGreen}
              name="arrow-forward"
              size={17}
            />
          </Pressable>
        </View>

        <Text style={styles.footerCopy}>
          No credit check • No judgment • Cancel anytime
        </Text>
      </ScrollView>

      <AcknowledgementModal
        acknowledgement={acknowledgement}
        onClose={() => setAcknowledgement(null)}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setPathwaysNoteOpen(false)}
        transparent
        visible={pathwaysNoteOpen}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Close Pathways information"
            accessibilityRole="button"
            onPress={() => setPathwaysNoteOpen(false)}
            style={styles.backdrop}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Pathways come with Elevation</Text>
            <Text style={styles.sheetBody}>
              You can review the Elevation plan above. Your current plan and
              progress stay exactly as they are.
            </Text>
            <AppButton
              accessibilityLabel="Back to plans"
              onPress={() => setPathwaysNoteOpen(false)}
              title="Back to plans"
              variant="outline"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PlanCard({
  plan,
  current,
  included,
  error,
  loading,
  onUpgrade,
}: {
  plan: SubscriptionPlanPublic;
  current: boolean;
  included: boolean;
  error?: string;
  loading: boolean;
  onUpgrade?: () => void;
}) {
  const emphasized = plan.key === Tier.GROWTH;
  const buttonTitle = current
    ? 'Current plan'
    : included
      ? 'Included in your plan'
      : plan.ctaLabel;
  return (
    <View style={[styles.planCard, emphasized && styles.planCardEmphasized]}>
      {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
      {current ? <Text style={styles.currentBadge}>Current plan</Text> : null}
      <View style={[styles.planIcon, emphasized && styles.planIconEmphasized]}>
        <Ionicons
          color={emphasized ? theme.colors.white : theme.colors.deepGreen}
          name={planIcon(plan.key)}
          size={25}
        />
      </View>
      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.tagline}>{plan.tagline}</Text>
      <Text style={styles.price}>
        ${formatPrice(plan.priceMonthly)}
        <Text style={styles.perMonth}>/month</Text>
      </Text>
      <Text style={styles.description}>{plan.description}</Text>
      <View style={styles.featureList}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons
              color={theme.colors.deepGreen}
              name="checkmark"
              size={18}
            />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <AppButton
        accessibilityLabel={buttonTitle}
        disabled={!onUpgrade}
        loading={loading}
        onPress={onUpgrade ?? (() => undefined)}
        title={buttonTitle}
        variant={emphasized ? 'gold' : 'outline'}
      />
      <FormNotice message={error} />
    </View>
  );
}

function AcknowledgementModal({
  acknowledgement,
  onClose,
}: {
  acknowledgement: UpgradeIntentResponse | null;
  onClose: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(acknowledgement)}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close upgrade acknowledgement"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>You're on the list.</Text>
          <Text style={styles.sheetBody}>{acknowledgement?.message}</Text>
          <AppButton
            accessibilityLabel="Got it"
            onPress={onClose}
            title="Got it"
          />
        </View>
      </View>
    </Modal>
  );
}

function planIcon(planKey: SubscriptionPlanPublic['key']): IoniconName {
  if (planKey === Tier.GROWTH) return 'flash-outline';
  if (planKey === Tier.ELEVATE) return 'ribbon-outline';
  return 'star-outline';
}

function formatPrice(price: number): string {
  return Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2);
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.cream, flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: 20, padding: 20, paddingBottom: 48 },
  back: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingRight: 12,
  },
  backText: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  heading: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 38,
    textAlign: 'center',
  },
  subheading: {
    color: theme.colors.mutedText,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  planList: { gap: 18 },
  planCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.deepGreen,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  planCardEmphasized: {
    backgroundColor: theme.colors.lightMint,
    borderWidth: 2,
    ...theme.shadows.card,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: 999,
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '900',
    marginTop: -34,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  currentBadge: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 999,
    color: theme.colors.teal,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  planIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.lavender,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  planIconEmphasized: { backgroundColor: theme.colors.teal },
  planName: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  tagline: { color: theme.colors.deepGreen, fontSize: 15, fontWeight: '800' },
  price: { color: theme.colors.text, fontSize: 34, fontWeight: '900' },
  perMonth: { color: theme.colors.mutedText, fontSize: 14, fontWeight: '500' },
  description: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 21 },
  featureList: { gap: 10 },
  featureRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9 },
  featureText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  pathwaysCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 18,
  },
  pathwaysIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  flex: { flex: 1, minWidth: 190 },
  pathwaysTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  pathwaysBody: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18 },
  pathwaysButton: {
    alignItems: 'center',
    borderColor: theme.colors.teal,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  pathwaysButtonText: {
    color: theme.colors.deepGreen,
    fontSize: 14,
    fontWeight: '900',
  },
  footerCopy: {
    color: theme.colors.mutedText,
    fontSize: 13,
    textAlign: 'center',
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(38, 22, 15, 0.35)', flex: 1 },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    gap: 14,
    padding: 22,
    paddingBottom: 36,
  },
  sheetTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '900' },
  sheetBody: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 21 },
});
