import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  notificationSettingsResponseSchema,
  notificationSettingsSchema,
  type NotificationSettings,
} from "@purposemint/contracts";
import { AppScreen } from "@/components/AppScreen";
import { AppButton } from "@/components/AppButton";
import { FormNotice } from "@/components/FormNotice";
import { theme } from "@/constants/theme";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
export default function NotificationManagementScreen() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const query = useQuery({
    queryKey: ["notifications", "preferences"],
    enabled: isAuthenticated,
    queryFn: async () =>
      notificationSettingsResponseSchema.parse(
        await apiRequest("/notifications/preferences", { authenticated: true }),
      ),
  });
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) router.replace("/(auth)/login");
  }, [isAuthenticated, isBootstrapping]);
  useEffect(() => {
    if (query.data) setSettings(query.data.settings);
  }, [query.data]);
  async function save() {
    const validated = notificationSettingsSchema.safeParse(settings);
    if (!validated.success) {
      setError(validated.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const result = notificationSettingsResponseSchema.parse(
        await apiRequest("/notifications/preferences", {
          authenticated: true,
          method: "PATCH",
          body: validated.data,
        }),
      );
      setSettings(result.settings);
      setNotice("Your notification preferences are saved.");
      await query.refetch();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save preferences.",
      );
    } finally {
      setSaving(false);
    }
  }
  const toggle = (key: string, channel: "push" | "email", value: boolean) =>
    setSettings((current) =>
      current
        ? {
            ...current,
            categories: {
              ...current.categories,
              [key]: { ...current.categories[key], [channel]: value },
            },
          }
        : null,
    );
  return (
    <AppScreen>
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={styles.back}>Back to profile</Text>
      </Pressable>
      <Text style={styles.title}>Notification management</Text>
      <Text style={styles.description}>
        Choose push and email notifications separately for each category.
      </Text>
      {query.isPending && (
        <ActivityIndicator accessibilityLabel="Loading preferences" />
      )}
      {query.error && (
        <>
          <FormNotice message={query.error.message} />
          <AppButton title="Try again" onPress={() => void query.refetch()} />
        </>
      )}
      {settings && query.data && (
        <>
          <FormNotice
            tone="neutral"
            message="Preferences are saved for future delivery. Push and email delivery are not connected yet."
          />
          {query.data.categories.map((category) => (
            <View style={styles.section} key={category.key}>
              <Text style={styles.heading}>{category.name}</Text>
              <Text style={styles.description}>
                {category.mandatory
                  ? "Required for account security or essential updates. Both channels stay enabled."
                  : !category.enabled
                    ? "This communication category is currently unavailable."
                    : "Optional communications"}
              </Text>
              {(["push", "email"] as const).map((channel) => (
                <View style={styles.row} key={channel}>
                  <Text style={styles.label}>
                    {channel === "push"
                      ? "Push notifications"
                      : "Email notifications"}
                  </Text>
                  <Switch
                    accessibilityLabel={`${category.name} ${channel}`}
                    disabled={
                      saving ||
                      category.mandatory ||
                      !category.enabled ||
                      !category[`${channel}Supported`]
                    }
                    value={
                      settings.categories[category.key]?.[channel] ?? false
                    }
                    onValueChange={(value) =>
                      toggle(category.key, channel, value)
                    }
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.mintDark,
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
          <View style={styles.section}>
            <Text style={styles.heading}>Optional communications</Text>
            <View style={styles.row}>
              <Text style={styles.label}>
                Pause all optional communications
              </Text>
              <Switch
                disabled={saving}
                accessibilityLabel="Pause optional communications"
                value={settings.optionalOptOut}
                onValueChange={(value) =>
                  setSettings({ ...settings, optionalOptOut: value })
                }
              />
            </View>
            <Text style={styles.description}>
              Your category choices stay saved. Required communications remain
              enabled.
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.heading}>Quiet hours</Text>
            <View style={styles.row}>
              <Text style={styles.label}>
                Pause optional delivery during quiet hours
              </Text>
              <Switch
                disabled={saving}
                accessibilityLabel="Enable quiet hours"
                value={settings.quietHours.enabled}
                onValueChange={(enabled) =>
                  setSettings({
                    ...settings,
                    quietHours: { ...settings.quietHours, enabled },
                  })
                }
              />
            </View>
            {(["start", "end", "timeZone"] as const).map((field) => (
              <View key={field}>
                <Text style={styles.label}>
                  {field === "timeZone"
                    ? "Timezone (for example America/Chicago)"
                    : field === "start"
                      ? "Start time (HH:MM)"
                      : "End time (HH:MM)"}
                </Text>
                <TextInput
                  accessibilityLabel={`Quiet hours ${field}`}
                  editable={!saving}
                  autoCapitalize="none"
                  style={styles.input}
                  value={settings.quietHours[field]}
                  onChangeText={(value) =>
                    setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, [field]: value },
                    })
                  }
                />
              </View>
            ))}
            <Text style={styles.description}>
              Required security, critical updates and transaction communications
              bypass quiet hours.
            </Text>
          </View>
          <FormNotice message={error} />
          <FormNotice message={notice} tone="success" />
          <AppButton
            title="Save preferences"
            loading={saving}
            onPress={() => void save()}
          />
        </>
      )}
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  back: { color: theme.colors.teal, fontSize: 16, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: theme.colors.text },
  description: {
    fontSize: 14,
    color: theme.colors.mutedText,
    lineHeight: 22,
    marginVertical: 8,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  heading: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 8,
  },
  label: { fontSize: 15, color: theme.colors.text, flexShrink: 1 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    marginVertical: 8,
  },
});
