import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CreateGoalInput, UserGoalPublic } from '@purposemint/contracts';

import { AppButton } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import { formatUsdExact } from '@/lib/format/money';

type ChangeGoalModalProps = {
  visible: boolean;
  goals: UserGoalPublic[];
  focusGoalId: string | null;
  onClose: () => void;
  onCreate: (input: CreateGoalInput) => Promise<UserGoalPublic>;
  onSelect: (goalId: string) => Promise<UserGoalPublic>;
};

export function ChangeGoalModal({
  visible,
  goals,
  focusGoalId,
  onClose,
  onCreate,
  onSelect,
}: ChangeGoalModalProps) {
  const [customTitle, setCustomTitle] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingGoalId, setPendingGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectGoal = async (goalId: string) => {
    setError(null);
    setPendingGoalId(goalId);
    try {
      await onSelect(goalId);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setPendingGoalId(null);
    }
  };

  const createGoal = async () => {
    const amountText = customAmount.trim();
    const amount = Number(amountText);
    const hasValidPrecision = /^\d+(\.\d{1,2})?$/.test(amountText);
    if (
      !customTitle.trim() ||
      !Number.isFinite(amount) ||
      amount < 1 ||
      amount > 10_000 ||
      !hasValidPrecision
    ) {
      setError(
        'Add a goal name and a target between $1 and $10,000 using no more than two decimal places.',
      );
      return;
    }

    setError(null);
    setCreating(true);
    try {
      await onCreate({ title: customTitle.trim(), targetAmount: amount });
      setCustomTitle('');
      setCustomAmount('');
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setCreating(false);
    }
  };

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
            <View style={styles.form}>
              <Text style={styles.empty}>
                Create your first savings goal so you can start logging what you set aside.
              </Text>
              <Text style={styles.label}>What are you saving for?</Text>
              <TextInput
                accessibilityLabel="What are you saving for?"
                accessibilityRole="text"
                maxLength={50}
                onChangeText={setCustomTitle}
                placeholder="e.g., School supplies, Car repair"
                placeholderTextColor={theme.colors.disabled}
                style={styles.input}
                value={customTitle}
              />
              <Text style={styles.counter}>{customTitle.length}/50 characters</Text>
              <Text style={styles.label}>Target amount ($)</Text>
              <TextInput
                accessibilityLabel="Target amount in dollars"
                accessibilityRole="text"
                keyboardType="decimal-pad"
                onChangeText={setCustomAmount}
                placeholder="e.g., 50"
                placeholderTextColor={theme.colors.disabled}
                style={styles.input}
                value={customAmount}
              />
              <Text style={styles.empty}>Between $1 and $10,000</Text>
              <AppButton
                accessibilityLabel="Add This Goal"
                loading={creating}
                onPress={() => void createGoal()}
                title="Add This Goal"
                variant="gold"
              />
            </View>
          ) : (
            goals.map((goal) => {
              const selected = goal.id === focusGoalId;
              return (
                <Pressable
                  accessibilityLabel={goal.title}
                  accessibilityRole="button"
                  accessibilityState={{ busy: pendingGoalId === goal.id, selected }}
                  disabled={pendingGoalId !== null}
                  key={goal.id}
                  onPress={() => void selectGoal(goal.id)}
                  style={[styles.row, selected && styles.rowSelected]}>
                  <Text style={styles.emoji}>{goal.iconEmoji}</Text>
                  <View style={styles.copy}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.meta}>
                      {formatUsdExact(goal.savedAmount)} / {formatUsdExact(goal.targetAmount)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
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
  form: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  counter: {
    color: theme.colors.mutedText,
    fontSize: 11,
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
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
