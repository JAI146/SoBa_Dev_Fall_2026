import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { UserGoalPublic } from '@purposemint/contracts';

import { theme } from '@/constants/theme';
import { formatUsd } from '@/lib/format/money';

type ChangeGoalModalProps = {
  visible: boolean;
  goals: UserGoalPublic[];
  focusGoalId: string | null;
  onClose: () => void;
  onSelect: (goalId: string) => void;
};

export function ChangeGoalModal({
  visible,
  goals,
  focusGoalId,
  onClose,
  onSelect,
}: ChangeGoalModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close change goal"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>Change current goal</Text>
          {goals.length === 0 ? (
            <Text style={styles.empty}>
              You don’t have a savings goal yet. You can add one when you’re ready.
            </Text>
          ) : (
            goals.map((goal) => {
              const selected = goal.id === focusGoalId;
              return (
                <Pressable
                  accessibilityLabel={goal.title}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={goal.id}
                  onPress={() => {
                    onSelect(goal.id);
                    onClose();
                  }}
                  style={[styles.row, selected && styles.rowSelected]}>
                  <Text style={styles.emoji}>{goal.iconEmoji}</Text>
                  <View style={styles.copy}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.meta}>
                      {formatUsd(goal.savedAmount)} / {formatUsd(goal.targetAmount)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(38, 22, 15, 0.35)',
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    paddingBottom: 32,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  empty: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  row: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
  },
  rowSelected: {
    backgroundColor: theme.colors.lightMint,
    borderColor: theme.colors.deepGreen,
  },
  emoji: {
    fontSize: 22,
  },
  copy: {
    flex: 1,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.mutedText,
    fontSize: 12,
  },
});
