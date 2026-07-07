import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DueHeroCard } from '@/components/home/due-hero-card';
import { GreetingHeader } from '@/components/home/greeting-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopicTile } from '@/components/topic-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useDueCards } from '@/hooks/use-due-cards';
import { useStreak } from '@/hooks/use-app-meta';
import { useTopics } from '@/hooks/use-topics';
import { getNextTopicToStudy, hasSeenLesson } from '@/lib/cards';

export default function HomeScreen() {
  const router = useRouter();
  const { cards: dueCards, refresh: refreshDue } = useDueCards({ limit: Infinity });
  const { topics, refresh: refreshTopics } = useTopics();
  const { streak, refresh: refreshStreak } = useStreak();

  useFocusEffect(
    useCallback(() => {
      refreshDue();
      refreshTopics();
      refreshStreak();
    }, [refreshDue, refreshTopics, refreshStreak])
  );

  async function goToTopic(topicId) {
    const seen = await hasSeenLesson(topicId);
    if (!seen) {
      router.push(`/lesson/${topicId}`);
    } else {
      router.push({ pathname: '/review', params: { topic: topicId } });
    }
  }

  async function handleStartReview() {
    const topicId = await getNextTopicToStudy();
    if (!topicId) return;

    const seen = await hasSeenLesson(topicId);
    if (!seen) {
      router.push(`/lesson/${topicId}`);
    } else {
      router.push('/review');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <GreetingHeader streak={streak} />

          <DueHeroCard count={dueCards.length} onStartReview={handleStartReview} />

          <View style={styles.topicsHeader}>
            <ThemedText type="label" themeColor="textSecondary">
              Topics
            </ThemedText>
          </View>

          <View style={styles.topicsGrid}>
            {topics.map((topic, index) => (
              <TopicTile
                key={topic.id}
                label={topic.label}
                mastery={topic.mastery}
                hue={topic.hue}
                icon={topic.icon}
                index={index}
                onPress={() => goToTopic(topic.id)}
              />
            ))}
          </View>
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
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  topicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
});
