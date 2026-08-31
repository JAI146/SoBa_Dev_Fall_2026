import {
  changePasswordSchema,
  timeZoneSchema,
  updateNotificationPreferencesSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type MessageResponse,
  type NotificationPreferences,
  type UpdateNotificationPreferencesInput,
  type UpdateProfileInput,
  type UserPublic,
} from "@purposemint/contracts";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { FormNotice } from "@/components/FormNotice";
import { ProfileModalFrame } from "@/components/profile/ProfileUi";
import { theme } from "@/constants/theme";
import { getApiFormErrors, getZodFieldErrors } from "@/lib/forms/errors";

type EditProfileField =
  "firstName" | "lastName" | "displayName" | "country" | "state" | "city";
type EditProfileErrors = Partial<Record<EditProfileField, string>>;

export function EditProfileModal({
  onClose,
  onSave,
  user,
  visible,
}: {
  onClose: () => void;
  onSave: (input: UpdateProfileInput) => Promise<UserPublic>;
  user: UserPublic;
  visible: boolean;
}) {
  const [values, setValues] = useState(() => profileValues(user));
  const [errors, setErrors] = useState<EditProfileErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setValues(profileValues(user));
    setErrors({});
    setFormError(undefined);
  }, [user, visible]);

  const setField = (field: EditProfileField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  const save = async () => {
    const changes: UpdateProfileInput = {
      ...(values.firstName.trim() !== user.firstName
        ? { firstName: values.firstName }
        : {}),
      ...(values.lastName.trim() !== user.lastName
        ? { lastName: values.lastName }
        : {}),
      ...(values.displayName.trim() !== (user.displayName ?? "")
        ? { displayName: values.displayName }
        : {}),
      ...(placeValue(values.country) !== user.country
        ? { country: placeValue(values.country) }
        : {}),
      ...(placeValue(values.state) !== user.state
        ? { state: placeValue(values.state) }
        : {}),
      ...(placeValue(values.city) !== user.city
        ? { city: placeValue(values.city) }
        : {}),
    };

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    const result = updateProfileSchema.safeParse(changes);
    if (!result.success) {
      setErrors(getZodFieldErrors<EditProfileField>(result.error.issues));
      return;
    }

    setSaving(true);
    setFormError(undefined);
    try {
      await onSave(result.data);
      onClose();
    } catch (error) {
      const next = getApiFormErrors(error, [
        "firstName",
        "lastName",
        "displayName",
        "country",
        "state",
        "city",
      ]);
      setErrors(next.fieldErrors);
      setFormError(
        next.formError ?? "Your profile could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileModalFrame
      busy={saving}
      onClose={onClose}
      title="Edit profile"
      visible={visible}
    >
      <Text style={styles.intro}>
        Choose the name we use around the app and keep your location up to date.
      </Text>
      <View style={styles.form}>
        <AppInput
          accessibilityRole="text"
          autoCapitalize="words"
          editable={!saving}
          error={errors.firstName}
          label="First name"
          onChangeText={(value) => setField("firstName", value)}
          placeholder="Maya"
          value={values.firstName}
        />
        <AppInput
          accessibilityRole="text"
          autoCapitalize="words"
          editable={!saving}
          error={errors.lastName}
          label="Last name"
          onChangeText={(value) => setField("lastName", value)}
          placeholder="Anderson"
          value={values.lastName}
        />
        <AppInput
          accessibilityRole="text"
          autoCapitalize="words"
          editable={!saving}
          error={errors.displayName}
          label="Display name"
          onChangeText={(value) => setField("displayName", value)}
          placeholder="Maya"
          value={values.displayName}
        />
        <AppInput
          accessibilityRole="text"
          autoCapitalize="words"
          editable={!saving}
          error={errors.country}
          label="Country (optional)"
          onChangeText={(value) => setField("country", value)}
          placeholder="United States"
          value={values.country}
        />
        <AppInput
          accessibilityRole="text"
          autoCapitalize="words"
          editable={!saving}
          error={errors.state}
          label="State (optional)"
          onChangeText={(value) => setField("state", value)}
          placeholder="Louisiana"
          value={values.state}
        />
        <AppInput
          accessibilityRole="text"
          autoCapitalize="words"
          editable={!saving}
          error={errors.city}
          label="City (optional)"
          onChangeText={(value) => setField("city", value)}
          placeholder="Baton Rouge"
          value={values.city}
        />
      </View>
      <FormNotice message={formError} />
      <AppButton
        loading={saving}
        loadingTitle="Saving profile…"
        onPress={() => void save()}
        title="Save profile"
      />
    </ProfileModalFrame>
  );
}

const notificationOptions: {
  description: string;
  key: keyof NotificationPreferences;
  label: string;
}[] = [
  {
    description: "News about PurposeMint features.",
    key: "productUpdates",
    label: "Product updates",
  },
  {
    description: "Gentle prompts about the goals you’re building.",
    key: "goalReminders",
    label: "Goal reminders",
  },
  {
    description: "A weekly moment to review your progress.",
    key: "weeklyCheckIn",
    label: "Weekly check-in",
  },
  {
    description: "Important notices about your account.",
    key: "securityAlerts",
    label: "Security alerts",
  },
];

export function NotificationPreferencesModal({
  current,
  onClose,
  onSave,
  visible,
}: {
  current: NotificationPreferences;
  onClose: () => void;
  onSave: (input: UpdateNotificationPreferencesInput) => Promise<UserPublic>;
  visible: boolean;
}) {
  const [values, setValues] = useState(current);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setValues(current);
    setError(undefined);
  }, [current, visible]);

  const save = async () => {
    const changes: UpdateNotificationPreferencesInput = {
      ...(values.productUpdates !== current.productUpdates
        ? { productUpdates: values.productUpdates }
        : {}),
      ...(values.goalReminders !== current.goalReminders
        ? { goalReminders: values.goalReminders }
        : {}),
      ...(values.weeklyCheckIn !== current.weeklyCheckIn
        ? { weeklyCheckIn: values.weeklyCheckIn }
        : {}),
      ...(values.securityAlerts !== current.securityAlerts
        ? { securityAlerts: values.securityAlerts }
        : {}),
    };

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    const result = updateNotificationPreferencesSchema.safeParse(changes);
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await onSave(result.data);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Your notification preferences could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileModalFrame
      busy={saving}
      onClose={onClose}
      title="Notification preferences"
      visible={visible}
    >
      <Text style={styles.intro}>
        Choose the messages you want to receive later.
      </Text>
      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>
          These choices are saved now and will take effect when notifications
          launch.
        </Text>
      </View>
      <View style={styles.toggleCard}>
        {notificationOptions.map((option) => (
          <View key={option.key} style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleLabel}>{option.label}</Text>
              <Text style={styles.toggleDescription}>{option.description}</Text>
            </View>
            <Switch
              accessibilityLabel={option.label}
              accessibilityRole="switch"
              accessibilityState={{
                checked: values[option.key],
                disabled: saving,
              }}
              disabled={saving}
              hitSlop={8}
              onValueChange={(value) =>
                setValues((existing) => ({ ...existing, [option.key]: value }))
              }
              trackColor={{
                false: theme.colors.disabled,
                true: theme.colors.deepGreen,
              }}
              value={values[option.key]}
            />
          </View>
        ))}
      </View>
      <FormNotice message={error} />
      <AppButton
        loading={saving}
        loadingTitle="Saving preferences…"
        onPress={() => void save()}
        title="Save preferences"
      />
    </ProfileModalFrame>
  );
}

type IntlWithTimeZones = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

function supportedTimeZones(current: string | null): string[] {
  const zones =
    (Intl as IntlWithTimeZones).supportedValuesOf?.("timeZone") ?? [];
  return Array.from(
    new Set(["UTC", ...(current ? [current] : []), ...zones]),
  ).sort();
}

export function TimeZoneModal({
  current,
  onClose,
  onSave,
  visible,
}: {
  current: string | null;
  onClose: () => void;
  onSave: (input: UpdateProfileInput) => Promise<UserPublic>;
  visible: boolean;
}) {
  const [value, setValue] = useState(current ?? "UTC");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => supportedTimeZones(current), [current]);
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return zones.slice(0, 30);
    return zones
      .filter((zone) => zone.toLowerCase().includes(query))
      .slice(0, 30);
  }, [value, zones]);

  useEffect(() => {
    if (!visible) return;
    setValue(current ?? "UTC");
    setError(undefined);
  }, [current, visible]);

  const save = async () => {
    const result = timeZoneSchema.safeParse(value);
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    if (result.data === current) {
      onClose();
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await onSave({ timeZone: result.data });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Your timezone could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileModalFrame
      busy={saving}
      onClose={onClose}
      title="Choose your timezone"
      visible={visible}
    >
      <Text style={styles.intro}>
        Habit streaks and reflection days follow this timezone. Update it if you
        travel or your device chose the wrong one.
      </Text>
      <View style={styles.inputBlock}>
        <Text style={styles.inputLabel}>Timezone</Text>
        <TextInput
          accessibilityLabel="Timezone"
          accessibilityRole="text"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!saving}
          onChangeText={(next) => {
            setValue(next);
            setError(undefined);
          }}
          placeholder="Search or enter an IANA timezone"
          placeholderTextColor={theme.colors.disabled}
          style={[styles.timeZoneInput, error && styles.inputError]}
          value={value}
        />
      </View>
      <Text style={styles.listLabel}>Suggested timezones</Text>
      <View style={styles.zoneList}>
        {matches.length > 0 ? (
          matches.map((zone) => (
            <Pressable
              accessibilityLabel={`Choose ${zone}`}
              accessibilityRole="button"
              accessibilityState={{
                disabled: saving,
                selected: value === zone,
              }}
              disabled={saving}
              key={zone}
              onPress={() => {
                setValue(zone);
                setError(undefined);
              }}
              style={({ pressed }) => [
                styles.zoneRow,
                value === zone && styles.zoneRowSelected,
                pressed && styles.zoneRowPressed,
              ]}
            >
              <Text style={styles.zoneText}>{zone}</Text>
              {value === zone ? (
                <Text style={styles.selectedText}>Selected</Text>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No matching timezone found. You can still save a valid IANA timezone
            above.
          </Text>
        )}
      </View>
      <FormNotice message={error} />
      <AppButton
        loading={saving}
        loadingTitle="Saving timezone…"
        onPress={() => void save()}
        title="Save timezone"
      />
    </ProfileModalFrame>
  );
}

type PasswordField = "currentPassword" | "newPassword";
type PasswordErrors = Partial<Record<PasswordField, string>>;

export function ChangePasswordModal({
  onClose,
  onSave,
  onSaved,
  visible,
}: {
  onClose: () => void;
  onSave: (input: ChangePasswordInput) => Promise<MessageResponse>;
  onSaved: (message: string) => void;
  visible: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCurrentPassword("");
    setNewPassword("");
    setErrors({});
    setFormError(undefined);
  }, [visible]);

  const save = async () => {
    const result = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
    });
    if (!result.success) {
      setErrors(getZodFieldErrors<PasswordField>(result.error.issues));
      return;
    }

    setSaving(true);
    setFormError(undefined);
    try {
      const response = await onSave(result.data);
      onSaved(response.message);
      onClose();
    } catch (error) {
      const next = getApiFormErrors(error, ["currentPassword", "newPassword"]);
      setErrors(next.fieldErrors);
      setFormError(
        next.formError ??
          "Your password could not be changed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileModalFrame
      busy={saving}
      onClose={onClose}
      title="Change password"
      visible={visible}
    >
      <Text style={styles.intro}>
        Changing your password signs out every other device. You’ll stay signed
        in on this one.
      </Text>
      <View style={styles.form}>
        <AppInput
          accessibilityRole="text"
          autoComplete="current-password"
          editable={!saving}
          error={errors.currentPassword}
          label="Current password"
          onChangeText={(next) => {
            setCurrentPassword(next);
            setErrors((currentErrors) => ({
              ...currentErrors,
              currentPassword: undefined,
            }));
            setFormError(undefined);
          }}
          placeholder="Your current password"
          secureTextEntry
          value={currentPassword}
        />
        <AppInput
          accessibilityRole="text"
          autoComplete="new-password"
          editable={!saving}
          error={errors.newPassword}
          label="New password"
          onChangeText={(next) => {
            setNewPassword(next);
            setErrors((currentErrors) => ({
              ...currentErrors,
              newPassword: undefined,
            }));
            setFormError(undefined);
          }}
          onSubmitEditing={() => void save()}
          placeholder="At least 8 characters"
          returnKeyType="done"
          secureTextEntry
          value={newPassword}
        />
      </View>
      <FormNotice message={formError} />
      <AppButton
        loading={saving}
        loadingTitle="Changing password…"
        onPress={() => void save()}
        title="Change password"
      />
    </ProfileModalFrame>
  );
}

export function ConfirmationModal({
  body,
  cancelLabel,
  confirmLabel,
  confirmingLabel,
  danger = false,
  onClose,
  onConfirm,
  title,
  visible,
}: {
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmingLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  visible: boolean;
}) {
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) setError(undefined);
  }, [visible]);

  const confirm = async () => {
    setConfirming(true);
    setError(undefined);
    try {
      await onConfirm();
      onClose();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "We could not complete that request. Please try again.",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ProfileModalFrame
      busy={confirming}
      onClose={onClose}
      title={title}
      visible={visible}
    >
      <Text style={styles.intro}>{body}</Text>
      <FormNotice message={error} />
      <AppButton
        loading={confirming}
        loadingTitle={confirmingLabel}
        onPress={() => void confirm()}
        textStyle={danger ? styles.dangerButtonText : undefined}
        title={confirmLabel}
        variant={danger ? "outline" : "primary"}
      />
      <AppButton
        disabled={confirming}
        onPress={onClose}
        title={cancelLabel}
        variant="soft"
      />
    </ProfileModalFrame>
  );
}

function profileValues(user: UserPublic) {
  return {
    city: user.city ?? "",
    country: user.country ?? "",
    displayName: user.displayName ?? "",
    firstName: user.firstName,
    lastName: user.lastName,
    state: user.state ?? "",
  };
}

function placeValue(value: string): string | null {
  return value.trim() || null;
}

const styles = StyleSheet.create({
  intro: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 21 },
  form: { gap: theme.spacing.md },
  noticeCard: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  noticeText: { color: theme.colors.mintDark, fontSize: 13, lineHeight: 19 },
  toggleCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleRow: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 76,
    padding: theme.spacing.md,
  },
  toggleCopy: { flex: 1 },
  toggleLabel: { color: theme.colors.text, fontSize: 14, fontWeight: "800" },
  toggleDescription: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  inputBlock: { gap: theme.spacing.xxs },
  inputLabel: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
  timeZoneInput: {
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  inputError: { borderColor: theme.colors.danger },
  listLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  zoneList: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  zoneRow: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  zoneRowSelected: { backgroundColor: theme.colors.lightMint },
  zoneRowPressed: { opacity: 0.75 },
  zoneText: { color: theme.colors.text, flex: 1, fontSize: 14 },
  selectedText: {
    color: theme.colors.deepGreen,
    fontSize: 11,
    fontWeight: "900",
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    padding: theme.spacing.md,
  },
  dangerButtonText: { color: theme.colors.danger },
});
