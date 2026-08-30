import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/AppButton';
import { theme } from '@/constants/theme';

type LogSavingsModalProps = {
  visible: boolean;
  goalTitle: string | null;
  onClose: () => void;
  onSave: (amount: number, note?: string) => Promise<void>;
  saving: boolean;
};

export function LogSavingsModal({
  visible,
  goalTitle,
  onClose,
  onSave,
  saving,
}: LogSavingsModalProps) {
  const [amount, setAmount] = useState('5');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setError(null);
    await onSave(value, note.trim() || undefined);
    setNote('');
    setAmount('5');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close log savings"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>Log savings</Text>
          {goalTitle ? (
            <Text style={styles.goal}>Toward {goalTitle}</Text>
          ) : (
            <Text style={styles.goal}>Pick a savings goal first, then you can log what you set aside.</Text>
          )}
          <Text style={styles.label}>Amount ($)</Text>
          <TextInput
            accessibilityLabel="Amount in dollars"
            editable={Boolean(goalTitle)}
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            style={styles.input}
            value={amount}
          />
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Note"
            editable={Boolean(goalTitle)}
            onChangeText={setNote}
            placeholder="What did you skip or set aside?"
            placeholderTextColor={theme.colors.disabled}
            style={styles.input}
            value={note}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            accessibilityLabel="Save"
            disabled={!goalTitle}
            loading={saving}
            onPress={() => void submit()}
            title="Save"
          />
          <Pressable
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  goal: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
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
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.xs,
  },
  cancel: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    color: theme.colors.mutedText,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
});
