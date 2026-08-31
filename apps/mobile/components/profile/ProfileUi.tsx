import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/constants/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function ProfileSection({
  children,
  title,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function SettingsRow({
  accessibilityLabel,
  danger = false,
  disabled = false,
  icon,
  label,
  onPress,
  supporting,
  trailing,
}: {
  accessibilityLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  icon: IoniconName;
  label: string;
  onPress?: () => void;
  supporting: string;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <View style={[styles.icon, danger && styles.dangerIcon]}>
        <Ionicons
          color={danger ? theme.colors.danger : theme.colors.deepGreen}
          name={icon}
          size={21}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>
          {label}
        </Text>
        <Text style={styles.rowSupporting}>{supporting}</Text>
      </View>
      {trailing ??
        (onPress ? (
          <Ionicons
            color={theme.colors.disabled}
            name="chevron-forward"
            size={19}
          />
        ) : null)}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `${label}. ${supporting}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function ProfileModalFrame({
  busy = false,
  children,
  onClose,
  title,
  visible,
}: PropsWithChildren<{
  busy?: boolean;
  onClose: () => void;
  title: string;
  visible: boolean;
}>) {
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalSafe}
      >
        <ScrollView
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalHeader}>
            <Pressable
              accessibilityLabel={`Close ${title}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={close}
              style={styles.closeButton}
            >
              <Ionicons color={theme.colors.text} name="close" size={24} />
            </Pressable>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={styles.closeButton} />
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.xs },
  sectionTitle: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    fontWeight: "900",
    letterSpacing: 0.8,
    paddingHorizontal: theme.spacing.xxs,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 76,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rowPressed: { backgroundColor: theme.colors.graphite },
  rowDisabled: { opacity: 0.62 },
  icon: {
    alignItems: "center",
    backgroundColor: theme.colors.lightMint,
    borderRadius: theme.radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  dangerIcon: { backgroundColor: theme.colors.lightMint },
  rowCopy: { flex: 1 },
  rowLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: "800",
  },
  dangerText: { color: theme.colors.danger },
  rowSupporting: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.xs,
    lineHeight: 17,
    marginTop: 3,
  },
  modalSafe: { backgroundColor: theme.colors.cream, flex: 1 },
  modalContent: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  modalTitle: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
});
