import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReferenceEntry } from '@/components/reference/reference-entry';
import { SearchBar } from '@/components/search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useReference } from '@/hooks/use-reference';
import { TOPICS } from '@/lib/content';

export default function ReferenceScreen() {
  const { entries, query, setQuery } = useReference();

  const grouped = TOPICS.map((topic) => ({
    topic,
    entries: entries.filter((entry) => entry.topic === topic.id),
  })).filter((group) => group.entries.length > 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Reference</ThemedText>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search methods, tags, topics" />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {grouped.length === 0 ? (
            <ThemedText themeColor="textSecondary" type="small">
              No methods match &quot;{query}&quot;.
            </ThemedText>
          ) : (
            grouped.map(({ topic, entries: topicEntries }) => (
              <View key={topic.id} style={styles.group}>
                <ThemedText type="label" themeColor="textSecondary">
                  {topic.label}
                </ThemedText>
                <View style={styles.groupList}>
                  {topicEntries.map((entry) => (
                    <ReferenceEntry key={entry.id} entry={entry} onMethodPress={setQuery} />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  group: {
    gap: Spacing.two,
  },
  groupList: {
    gap: Spacing.two,
  },
});
