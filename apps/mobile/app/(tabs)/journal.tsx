import { Ionicons } from '@expo/vector-icons';
import type { ReflectionPublic } from '@purposemint/contracts';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QueryErrorState } from '@/components/QueryErrorState';
import { ReflectionEditorModal } from '@/components/reflections/ReflectionEditorModal';
import { moodEmoji } from '@/components/reflections/MoodSelector';
import { theme } from '@/constants/theme';
import { useReflectionHistory } from '@/hooks/use-reflections';

export default function JournalScreen() {
  const query = useReflectionHistory(),
    items = useMemo(
      () => query.data?.pages.flatMap((page) => page.items) ?? [],
      [query.data],
    ),
    [editorOpen, setEditorOpen] = useState(false),
    [selected, setSelected] = useState<ReflectionPublic | null>(null);
  if (query.isError && !query.data)
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <QueryErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : 'Your reflections could not be loaded.'
          }
          onRetry={() => void query.refetch()}
        />
      </SafeAreaView>
    );
  if (query.isLoading)
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.deepGreen} size="large" />
        </View>
      </SafeAreaView>
    );
  const open = (reflection: ReflectionPublic | null) => {
    setSelected(reflection);
    setEditorOpen(true);
  };
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>A MOMENT FOR YOU</Text>
            <Text style={styles.heading}>Your Journal</Text>
            <Text style={styles.subtitle}>
              A private place to notice what is happening, in your own words.
            </Text>
            <Pressable
              accessibilityLabel="Write a reflection"
              accessibilityRole="button"
              onPress={() => open(null)}
              style={styles.compose}
            >
              <Ionicons
                color={theme.colors.white}
                name="create-outline"
                size={20}
              />
              <Text style={styles.composeText}>Write a reflection</Text>
            </Pressable>
            <Text style={styles.section}>Recent entries</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              color={theme.colors.deepGreen}
              name="book-outline"
              size={30}
            />
            <Text style={styles.emptyTitle}>
              Your journal is ready when you are.
            </Text>
            <Text style={styles.emptyBody}>
              You can write a sentence, add a mood, or simply come back later.
            </Text>
          </View>
        }
        ListFooterComponent={
          query.hasNextPage ? (
            <Pressable
              accessibilityLabel="Load more reflections"
              accessibilityRole="button"
              accessibilityState={{ busy: query.isFetchingNextPage }}
              disabled={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
              style={styles.loadMore}
            >
              {query.isFetchingNextPage ? (
                <ActivityIndicator color={theme.colors.deepGreen} />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage)
            void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <ReflectionRow item={item} onPress={() => open(item)} />
        )}
        showsVerticalScrollIndicator={false}
      />
      <ReflectionEditorModal
        onClose={() => setEditorOpen(false)}
        reflection={selected}
        visible={editorOpen}
      />
    </SafeAreaView>
  );
}
function ReflectionRow({
  item,
  onPress,
}: {
  item: ReflectionPublic;
  onPress: () => void;
}) {
  const voice = item.kind === 'voice',
    snippet = item.body?.trim() || 'Mood check-in';
  return (
    <Pressable
      accessibilityLabel={`${voice ? 'Voice' : 'Text'} entry from ${formatDate(item.reflectedOn)}. ${snippet}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.kind}>
          <Ionicons
            color={theme.colors.deepGreen}
            name={voice ? 'mic-outline' : 'document-text-outline'}
            size={18}
          />
          <Text style={styles.kindText}>{voice ? 'Voice' : 'Text'}</Text>
        </View>
        <Text style={styles.date}>{formatDate(item.reflectedOn)}</Text>
      </View>
      <Text numberOfLines={3} style={styles.snippet}>
        {snippet}
      </Text>
      <View style={styles.meta}>
        {item.moodScore ? (
          <Text style={styles.mood}>
            {moodEmoji(item.moodScore)} Mood {item.moodScore}/5
          </Text>
        ) : null}
        {voice && item.durationSeconds !== null ? (
          <Text style={styles.date}>
            {formatDuration(item.durationSeconds)}
          </Text>
        ) : null}
        {item.themes.map((theme) => (
          <Text key={theme.key} style={styles.theme}>
            {theme.label}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}
function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60),
    rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.cream, flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: 12, padding: 20, paddingBottom: 112 },
  header: { gap: 10, marginBottom: 8 },
  eyebrow: {
    color: theme.colors.deepGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: { color: theme.colors.mutedText, fontSize: 15, lineHeight: 22 },
  compose: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: theme.colors.deepGreen,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
    marginTop: 8,
  },
  composeText: { color: theme.colors.white, fontSize: 16, fontWeight: '900' },
  section: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    minHeight: 120,
    padding: 16,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kind: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  kindText: { color: theme.colors.deepGreen, fontSize: 12, fontWeight: '900' },
  date: { color: theme.colors.mutedText, fontSize: 12, fontWeight: '700' },
  snippet: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mood: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  theme: {
    backgroundColor: theme.colors.lightMint,
    borderRadius: 999,
    color: theme.colors.deepGreen,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadMore: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  loadMoreText: {
    color: theme.colors.deepGreen,
    fontSize: 14,
    fontWeight: '900',
  },
});
