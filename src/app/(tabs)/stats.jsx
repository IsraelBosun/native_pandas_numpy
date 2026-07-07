import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeatmapGrid } from '@/components/stats/heatmap-grid';
import { RetentionBars } from '@/components/stats/retention-bars';
import { WeakTopicRow } from '@/components/stats/weak-topic-row';
import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStreak } from '@/hooks/use-app-meta';
import { useReviewHeatmap, useRetentionSeries, useWeakestTopics } from '@/hooks/use-stats';

export default function StatsScreen() {
  const { data: heatmap, refresh: refreshHeatmap } = useReviewHeatmap({ weeks: 12 });
  const { data: retention, refresh: refreshRetention } = useRetentionSeries({ days: 14 });
  const { data: weakTopics, refresh: refreshWeakTopics } = useWeakestTopics({ limit: 3 });
  const { streak, refresh: refreshStreak } = useStreak();

  useFocusEffect(
    useCallback(() => {
      refreshHeatmap();
      refreshRetention();
      refreshWeakTopics();
      refreshStreak();
    }, [refreshHeatmap, refreshRetention, refreshWeakTopics, refreshStreak])
  );

  const totalReviews = heatmap.reduce((sum, day) => sum + day.count, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title">Stats</ThemedText>
            <StreakPill days={streak} label="day streak" />
          </View>

          <Section title="Review activity" subtitle={`${totalReviews} reviews in the last 12 weeks`}>
            <HeatmapGrid data={heatmap} />
          </Section>

          <Section title="Retention" subtitle="Last 14 days">
            <RetentionBars data={retention} />
          </Section>

          <Section title="Weakest topics" subtitle="Lowest average ease">
            {weakTopics.length === 0 ? (
              <ThemedText themeColor="textSecondary" type="small">
                Not enough reviews yet.
              </ThemedText>
            ) : (
              <View style={styles.weakList}>
                {weakTopics.map((topic) => (
                  <WeakTopicRow
                    key={topic.id}
                    label={topic.label}
                    hue={topic.hue}
                    icon={topic.icon}
                    avgEf={topic.avgEf}
                  />
                ))}
              </View>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <View style={styles.section}>
      <ThemedText type="label" themeColor="textSecondary">
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {subtitle}
      </ThemedText>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionBody: {
    marginTop: Spacing.one,
  },
  weakList: {
    gap: Spacing.two,
  },
});
