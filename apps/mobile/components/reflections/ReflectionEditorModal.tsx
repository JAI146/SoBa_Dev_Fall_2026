import { Ionicons } from '@expo/vector-icons';
import type { ReflectionPublic } from '@purposemint/contracts';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import { AppButton } from '@/components/AppButton';
import { FormNotice } from '@/components/FormNotice';
import { MoodSelector } from './MoodSelector';
import { theme } from '@/constants/theme';
import { useReflectionMutations } from '@/hooks/use-reflections';

function themeChipColor(colorToken: string) {
  if (colorToken === 'teal') return theme.colors.accentSoft;
  if (colorToken === 'gold') return theme.colors.paleGold;
  if (colorToken === 'plum') return theme.colors.lavender;
  return theme.colors.lightMint;
}

export function ReflectionEditorModal({
  visible,
  reflection,
  onClose,
}: {
  visible: boolean;
  reflection: ReflectionPublic | null;
  onClose: () => void;
}) {
  const actions = useReflectionMutations();
  const [body, setBody] = useState(''),
    [mood, setMood] = useState<number | null>(null),
    [saved, setSaved] = useState<ReflectionPublic | null>(null),
    [saving, setSaving] = useState(false),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState<string | null>(null);
  const current = saved ?? reflection;
  const editing = Boolean(current);
  useEffect(() => {
    if (visible) {
      setBody(reflection?.body ?? '');
      setMood(reflection?.moodScore ?? null);
      setSaved(reflection);
      setError(null);
    }
  }, [reflection, visible]);
  const close = () => {
    setSaved(null);
    onClose();
  };
  const save = async () => {
    if (!body.trim() && (!current || current.body !== null)) {
      setError(
        current
          ? 'A written reflection cannot be empty.'
          : 'Write a few words before saving.',
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = current
        ? await actions.update({
            id: current.id,
            input: {
              ...(body.trim() ? { body: body.trim() } : {}),
              moodScore: mood,
            },
          })
        : await actions.create({
            kind: 'text',
            body: body.trim(),
            ...(mood === null ? {} : { moodScore: mood }),
          });
      setSaved(result);
      setBody(result.body ?? '');
      setMood(result.moodScore);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Your reflection could not be saved. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = () => {
    if (!current) return;
    Alert.alert(
      'Delete this reflection?',
      'This removes the reflection and its matched themes. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              setDeleting(true);
              setError(null);
              try {
                await actions.remove(current.id);
                close();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'Your reflection could not be deleted. Please try again.',
                );
              } finally {
                setDeleting(false);
              }
            })(),
        },
      ],
    );
  };
  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safe}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Close reflection editor"
              accessibilityRole="button"
              onPress={close}
              style={styles.iconButton}
            >
              <Ionicons color={theme.colors.text} name="close" size={24} />
            </Pressable>
            <Text style={styles.title}>
              {editing ? 'Your reflection' : 'Take a moment'}
            </Text>
            <View style={styles.iconButton} />
          </View>
          <Text style={styles.intro}>
            {editing
              ? 'Read what you wrote, then change anything that no longer feels right.'
              : 'Write what is true for you right now. A sentence or two is enough.'}
          </Text>
          <Text style={styles.label}>Your reflection</Text>
          <TextInput
            accessibilityLabel="Your reflection"
            accessibilityRole="text"
            maxLength={1000}
            multiline
            onChangeText={setBody}
            placeholder="What is on your mind?"
            placeholderTextColor={theme.colors.disabled}
            style={styles.input}
            textAlignVertical="top"
            value={body}
          />
          <Text style={styles.counter}>{body.length}/1,000</Text>
          <Text style={styles.label}>Add a mood if you want</Text>
          <MoodSelector allowClear onChange={setMood} value={mood} />
          <Pressable
            accessibilityLabel="Voice reflections are planned and not available yet"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.voice}
          >
            <Ionicons
              color={theme.colors.mutedText}
              name="mic-outline"
              size={22}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceTitle}>Voice reflection</Text>
              <Text style={styles.voiceBody}>
                Planned for a future update. No microphone access is used today.
              </Text>
            </View>
            <Text style={styles.planned}>Planned</Text>
          </Pressable>
          {saved && saved.themes.length > 0 ? (
            <View style={styles.themeBox}>
              <Text style={styles.label}>Themes found in this reflection</Text>
              <View style={styles.chips}>
                {saved.themes.map((theme) => (
                  <Text
                    key={theme.key}
                    style={[
                      styles.chip,
                      { backgroundColor: themeChipColor(theme.colorToken) },
                    ]}
                  >
                    {theme.label}
                  </Text>
                ))}
              </View>
              <Text style={styles.voiceBody}>
                Themes are matched from words in your reflection and may not
                capture every meaning.
              </Text>
            </View>
          ) : null}
          <FormNotice message={error ?? undefined} />
          <AppButton
            accessibilityLabel={editing ? 'Save Changes' : 'Save Reflection'}
            loading={saving}
            onPress={() => void save()}
            title={editing ? 'Save Changes' : 'Save Reflection'}
          />
          {editing ? (
            <Pressable
              accessibilityLabel="Delete reflection"
              accessibilityRole="button"
              accessibilityState={{ busy: deleting, disabled: deleting }}
              disabled={deleting}
              onPress={remove}
              style={styles.delete}
            >
              <Text style={styles.deleteText}>
                {deleting ? 'Deleting…' : 'Delete reflection'}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.cream, flex: 1 },
  content: { gap: 16, padding: 20, paddingBottom: 48 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '900' },
  intro: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 21 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 150,
    padding: 16,
  },
  counter: { color: theme.colors.mutedText, fontSize: 11, textAlign: 'right' },
  voice: {
    alignItems: 'center',
    backgroundColor: theme.colors.graphite,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    opacity: 0.75,
    padding: 14,
  },
  voiceTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  voiceBody: { color: theme.colors.mutedText, fontSize: 12, lineHeight: 17 },
  planned: {
    backgroundColor: theme.colors.lavender,
    borderRadius: 999,
    color: theme.colors.plum,
    fontSize: 11,
    fontWeight: '900',
    padding: 7,
  },
  themeBox: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: 18,
    gap: 10,
    padding: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: theme.colors.white,
    borderRadius: 999,
    color: theme.colors.deepGreen,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  delete: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  deleteText: { color: theme.colors.danger, fontSize: 14, fontWeight: '800' },
});
