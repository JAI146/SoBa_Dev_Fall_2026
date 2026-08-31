import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { FormNotice } from '@/components/FormNotice';
import { MoodSelector } from './MoodSelector';
import { theme } from '@/constants/theme';
import { useReflectionMutations } from '@/hooks/use-reflections';
export function MoodCheckInModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [mood, setMood] = useState<number | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null);
  const actions = useReflectionMutations();
  useEffect(() => {
    if (!visible) {
      setMood(null);
      setError(null);
    }
  }, [visible]);
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close mood check-in"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>How are you feeling?</Text>
          <Text style={styles.body}>
            Choose the number that feels closest. There is no right answer.
          </Text>
          <MoodSelector value={mood} onChange={setMood} />
          <FormNotice message={error ?? undefined} />
          <AppButton
            accessibilityLabel="Save Mood"
            disabled={mood === null}
            loading={saving}
            onPress={() =>
              void (async () => {
                if (mood === null) return;
                setSaving(true);
                setError(null);
                try {
                  await actions.saveMood({ moodScore: mood });
                  onClose();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : 'Your mood could not be saved. Please try again.',
                  );
                } finally {
                  setSaving(false);
                }
              })()
            }
            title="Save Mood"
          />
          <Pressable
            accessibilityLabel="Not now"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(38, 22, 15, 0.35)', flex: 1 },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  body: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 20 },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  cancelText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '800',
  },
});
