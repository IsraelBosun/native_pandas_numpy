import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeTile } from '@/components/practice/challenge-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopicTile } from '@/components/topic-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChallenges } from '@/hooks/use-challenges';
import { useTopics } from '@/hooks/use-topics';

export default function PracticeScreen() {
  const router = useRouter();
  const { topics, refresh: refreshTopics } = useTopics();
  const { challenges, refresh: refreshChallenges } = useChallenges();

  useFocusEffect(
    useCallback(() => {
      refreshTopics();
      refreshChallenges();
    }, [refreshTopics, refreshChallenges])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Practice</ThemedText>

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Workflow challenges
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Multi-step real-world pipelines — watch the table change as you work.
            </ThemedText>
            {challenges.map((challenge) => (
              <ChallengeTile
                key={challenge.id}
                {...challenge}
                onPress={() => router.push(`/practice/challenge/${challenge.id}`)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Drill a topic
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Any topic, off-schedule — this never touches your review dates.
            </ThemedText>
            <View style={styles.topicsGrid}>
              {topics.map((topic, index) => (
                <TopicTile
                  key={topic.id}
                  label={topic.label}
                  mastery={topic.mastery}
                  hue={topic.hue}
                  icon={topic.icon}
                  index={index}
                  onPress={() => router.push(`/practice/${topic.id}`)}
                />
              ))}
            </View>
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
  section: {
    gap: Spacing.two,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
});
