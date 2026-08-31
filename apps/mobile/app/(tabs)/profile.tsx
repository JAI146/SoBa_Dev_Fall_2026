import { Ionicons } from "@expo/vector-icons";
import {
  PolicyDocumentKey,
  Tier,
  type PolicyAgreementRecord,
} from "@purposemint/contracts";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppScreen } from "@/components/AppScreen";
import { FormNotice } from "@/components/FormNotice";
import {
  ChangePasswordModal,
  ConfirmationModal,
  EditProfileModal,
  NotificationPreferencesModal,
  TimeZoneModal,
} from "@/components/profile/ProfileModals";
import { ProfileSection, SettingsRow } from "@/components/profile/ProfileUi";
import { QueryErrorState } from "@/components/QueryErrorState";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useProfileActions } from "@/hooks/use-profile-actions";

type OpenModal =
  | "edit-profile"
  | "notifications"
  | "timezone"
  | "password"
  | "logout-all"
  | "deletion"
  | null;

const membershipNames = {
  [Tier.FREE]: "Starter",
  [Tier.GROWTH]: "Momentum",
  [Tier.ELEVATE]: "Elevation",
} as const;

export default function ProfileScreen() {
  const userQuery = useCurrentUser();
  const actions = useProfileActions();
  const { logout, logoutAll } = useAuth();
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [notice, setNotice] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);

  if (userQuery.error) {
    return (
      <QueryErrorState
        message={userQuery.error.message}
        onRetry={() => void userQuery.refetch()}
      />
    );
  }

  if (userQuery.isLoading || !userQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.deepGreen} size="large" />
      </View>
    );
  }

  const user = userQuery.data;
  const membershipName = membershipNames[user.tier];
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const displayName = user.displayName ?? fullName;
  const enabledNotifications = Object.values(
    user.notificationPreferences,
  ).filter(Boolean).length;

  const closeModal = () => setOpenModal(null);
  const open = (modal: Exclude<OpenModal, null>) => {
    setActionError(undefined);
    setNotice(undefined);
    setOpenModal(modal);
  };

  const signOutHere = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace("/(auth)/login");
      setSigningOut(false);
    }
  };

  const cancelDeletion = async () => {
    setActionError(undefined);
    setNotice(undefined);
    try {
      await actions.cancelDeletion.mutateAsync();
      setNotice(
        "Your deletion request is cancelled. Your account remains active.",
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Your deletion request could not be cancelled. Please try again.",
      );
    }
  };

  return (
    <>
      <AppScreen contentContainerStyle={styles.content}>
        <View style={styles.headingBlock}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>
            Your account, preferences, and progress—all in one place.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View
            accessibilityLabel={`${initials(user.firstName, user.lastName)} initials`}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {initials(user.firstName, user.lastName)}
            </Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
          <Pressable
            accessibilityLabel={`${membershipName} membership. View plans`}
            accessibilityRole="link"
            onPress={() => router.push("/pricing")}
            style={({ pressed }) => [
              styles.planBadge,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.planText}>{membershipName}</Text>
            <Ionicons
              color={theme.colors.deepGreen}
              name="chevron-forward"
              size={15}
            />
          </Pressable>
        </View>

        <FormNotice message={notice} tone="success" />

        <ProfileSection title="Account">
          <SettingsRow
            icon="person-outline"
            label="Edit profile"
            onPress={() => open("edit-profile")}
            supporting="Name and location"
          />
          <SettingsRow
            icon="key-outline"
            label="Change password"
            onPress={() => open("password")}
            supporting="Keep this device signed in"
          />
        </ProfileSection>

        <ProfileSection title="Preferences">
          <SettingsRow
            icon="notifications-outline"
            label="Notification preferences"
            onPress={() => open("notifications")}
            supporting={`${enabledNotifications} of 4 turned on`}
          />
          <SettingsRow
            icon="globe-outline"
            label="Timezone"
            onPress={() => open("timezone")}
            supporting={user.timeZone ?? "Not set"}
          />
        </ProfileSection>

        <ProfileSection title="Membership">
          <SettingsRow
            accessibilityLabel={`${membershipName} is your current plan. View membership plans`}
            icon="ribbon-outline"
            label="Current plan"
            onPress={() => router.push("/pricing")}
            supporting={`${membershipName} · See what each plan includes`}
          />
        </ProfileSection>

        <ProfileSection title="Legal">
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Use"
            supporting={policyRecord(
              user.policyAgreements[PolicyDocumentKey.TERMS_OF_USE],
              user.timeZone,
            )}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            supporting={policyRecord(
              user.policyAgreements[PolicyDocumentKey.PRIVACY_POLICY],
              user.timeZone,
            )}
          />
          <Text style={styles.legalNote}>
            This is the acceptance record saved with your account.
          </Text>
        </ProfileSection>

        <ProfileSection title="Sign out">
          <SettingsRow
            disabled={signingOut}
            icon="log-out-outline"
            label={signingOut ? "Signing out…" : "Sign out on this device"}
            onPress={() => void signOutHere()}
            supporting="End this session only"
          />
          <SettingsRow
            icon="phone-portrait-outline"
            label="Sign out on all devices"
            onPress={() => open("logout-all")}
            supporting="End every active session"
          />
        </ProfileSection>

        <ProfileSection title="Danger zone">
          {user.deleteAccountRequestedAt ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>Deletion request pending</Text>
              <Text style={styles.pendingBody}>
                Requested{" "}
                {formatAccountDate(
                  user.deleteAccountRequestedAt,
                  user.timeZone,
                )}
                . Your account is still active while the request is reviewed.
                You can cancel the request at any time before it is completed.
              </Text>
              <FormNotice message={actionError} />
              <AppButton
                loading={actions.cancelDeletion.isPending}
                loadingTitle="Cancelling request…"
                onPress={() => void cancelDeletion()}
                title="Cancel deletion request"
                variant="outline"
              />
            </View>
          ) : (
            <>
              <SettingsRow
                danger
                icon="trash-outline"
                label="Request account deletion"
                onPress={() => open("deletion")}
                supporting="Record a request you can cancel before it is completed"
              />
              <View style={styles.inlineNotice}>
                <FormNotice message={actionError} />
              </View>
            </>
          )}
        </ProfileSection>
      </AppScreen>

      <EditProfileModal
        onClose={closeModal}
        onSave={async (input) => {
          const updated = await actions.updateProfile.mutateAsync(input);
          setNotice("Your profile is up to date.");
          return updated;
        }}
        user={user}
        visible={openModal === "edit-profile"}
      />
      <NotificationPreferencesModal
        current={user.notificationPreferences}
        onClose={closeModal}
        onSave={async (input) => {
          const updated = await actions.updateNotifications.mutateAsync(input);
          setNotice("Your notification preferences are saved.");
          return updated;
        }}
        visible={openModal === "notifications"}
      />
      <TimeZoneModal
        current={user.timeZone}
        onClose={closeModal}
        onSave={async (input) => {
          const updated = await actions.updateTimeZone.mutateAsync(input);
          setNotice("Your timezone is updated.");
          return updated;
        }}
        visible={openModal === "timezone"}
      />
      <ChangePasswordModal
        onClose={closeModal}
        onSave={actions.changePassword.mutateAsync}
        onSaved={setNotice}
        visible={openModal === "password"}
      />
      <ConfirmationModal
        body="This signs you out everywhere, including this device. It’s a good next step if you think someone else may know your password. You can sign in again whenever you’re ready."
        cancelLabel="Keep me signed in"
        confirmLabel="Sign out everywhere"
        confirmingLabel="Signing out everywhere…"
        onClose={closeModal}
        onConfirm={async () => {
          await logoutAll();
          router.replace("/(auth)/login");
        }}
        title="Sign out on all devices?"
        visible={openModal === "logout-all"}
      />
      <ConfirmationModal
        body="This records a deletion request. Your account is not deleted immediately, and you can cancel the request before it is completed."
        cancelLabel="Keep account as it is"
        confirmLabel="Confirm deletion request"
        confirmingLabel="Recording request…"
        danger
        onClose={closeModal}
        onConfirm={async () => {
          await actions.requestDeletion.mutateAsync();
          setNotice(
            "Your deletion request is recorded. Your account remains active while the request is reviewed.",
          );
        }}
        title="Request account deletion?"
        visible={openModal === "deletion"}
      />
    </>
  );
}

function initials(firstName: string, lastName: string): string {
  return (
    `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() ||
    "PM"
  );
}

function policyRecord(
  record: PolicyAgreementRecord | undefined,
  timeZone: string | null,
): string {
  if (!record) return "No acceptance recorded";
  return `Accepted version ${record.version} · ${formatAccountDate(record.agreedAt, timeZone)}`;
}

function formatAccountDate(value: string, timeZone: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: timeZone ?? "UTC",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(value));
  }
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: theme.colors.cream,
    flex: 1,
    justifyContent: "center",
  },
  content: { gap: theme.spacing.lg },
  headingBlock: { gap: theme.spacing.xxs },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitle: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 20 },
  profileCard: {
    alignItems: "center",
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.xl,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: theme.colors.deepGreen,
    borderRadius: theme.radius.pill,
    height: 76,
    justifyContent: "center",
    width: 76,
    ...theme.shadows.card,
  },
  avatarText: { color: theme.colors.white, fontSize: 25, fontWeight: "900" },
  identity: { alignItems: "center", gap: 3 },
  name: { color: theme.colors.text, fontSize: 23, fontWeight: "900" },
  email: { color: theme.colors.mutedText, fontSize: 13 },
  planBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xxs,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
  },
  planText: { color: theme.colors.deepGreen, fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.75 },
  legalNote: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 18,
    padding: theme.spacing.md,
  },
  pendingCard: { gap: theme.spacing.sm, padding: theme.spacing.md },
  pendingTitle: { color: theme.colors.danger, fontSize: 15, fontWeight: "900" },
  pendingBody: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 20 },
  inlineNotice: { paddingHorizontal: theme.spacing.md },
});
