import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeTile } from '@/components/practice/challenge-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopicTile } from '@/components/topic-tile';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useChallenges } from '@/hooks/use-challenges';
import { useFavoritesCount } from '@/hooks/use-favorites';
import { useTheme, useTopicHues } from '@/hooks/use-theme';
import { useTopics } from '@/hooks/use-topics';

export default function PracticeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const hues = useTopicHues();
  const { topics, refresh: refreshTopics } = useTopics();
  const { challenges, refresh: refreshChallenges } = useChallenges();
  const { count: favoritesCount, refresh: refreshFavorites } = useFavoritesCount();

  useFocusEffect(
    useCallback(() => {
      refreshTopics();
      refreshChallenges();
      refreshFavorites();
    }, [refreshTopics, refreshChallenges, refreshFavorites])
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
              Multi-step real-world pipelines. Watch the table change as you work.
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
              Starred
            </ThemedText>
            <Pressable
              disabled={favoritesCount === 0}
              onPress={() => router.push('/practice/favorites')}
              style={({ pressed }) => [
                styles.starredRow,
                { borderColor: theme.border },
                favoritesCount === 0 && styles.starredRowDisabled,
                pressed && favoritesCount > 0 && styles.pressed,
              ]}>
              <View style={styles.starredLeft}>
                <View style={[styles.starredIconChip, { backgroundColor: hues.amber.surface }]}>
                  <Feather name="star" size={16} color={hues.amber.fg} />
                </View>
                <ThemedText type="smallBold">
                  {favoritesCount === 0 ? 'No starred cards yet' : `Review ${favoritesCount} starred card${favoritesCount === 1 ? '' : 's'}`}
                </ThemedText>
              </View>
              {favoritesCount > 0 && <Feather name="chevron-right" size={18} color={theme.textSecondary} />}
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Drill a topic
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Any topic, off-schedule. This never touches your review dates.
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

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Race mode
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Dodge traffic, answer pop quizzes. Also off-schedule, also ungraded.
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
                  onPress={() => router.push(`/practice/race/${topic.id}`)}
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
  starredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  starredRowDisabled: {
    opacity: 0.6,
  },
  starredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  starredIconChip: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
