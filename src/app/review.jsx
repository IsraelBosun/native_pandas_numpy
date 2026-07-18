import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress-bar';
import { ComboPill } from '@/components/review/combo-pill';
import { GradeButtons } from '@/components/review/grade-buttons';
import { ReviewCard } from '@/components/review/review-card';
import { SessionSummary } from '@/components/session-summary';
import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStreak } from '@/hooks/use-app-meta';
import { useSession } from '@/hooks/use-session';
import { useTheme, useTopicHues } from '@/hooks/use-theme';
import { TOPICS } from '@/lib/content';

export default function ReviewScreen() {
  const { topic } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const hues = useTopicHues();
  const session = useSession({ topic });
  const { streak, refresh: refreshStreak } = useStreak();
  const scrollRef = useRef(null);

  // The streak bumps on the first recorded review of the day (inside
  // recordReview), so re-read it after every grade — this also guarantees the
  // session summary shows the committed value.
  useEffect(() => {
    refreshStreak();
  }, [session.stats.reviewed, refreshStreak]);

  if (session.loading) return null;

  if (session.complete) {
    return (
      <SessionSummary
        reviewed={session.stats.reviewed}
        missed={session.stats.missed}
        xp={session.stats.xp}
        streak={streak}
        newAchievements={session.newAchievements}
        onDone={() => router.replace('/')}
      />
    );
  }

  const { currentCard } = session;
  // One-render gap: grading the last card advances `index` past the end of
  // the queue immediately, but `complete` only flips true on the next effect
  // pass — currentCard is briefly undefined in between.
  if (!currentCard) return null;
  const topicMeta = TOPICS.find((t) => t.id === currentCard.topic);
  const identity = hues[topicMeta?.hue] ?? hues.blue;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar progress={session.position / session.total} color={theme.action} />
          </View>
        </View>
        <ThemedText themeColor="textSecondary" type="small" style={styles.counter}>
          {session.position}/{session.total}
        </ThemedText>

        <View style={styles.metaRow}>
          <View style={[styles.topicPill, { backgroundColor: identity.surface }]}>
            <ThemedText type="smallBold" style={{ color: identity.fg }}>
              {topicMeta?.label}
            </ThemedText>
          </View>
          <View style={styles.badges}>
            <ComboPill combo={session.combo} />
            <StreakPill days={streak} label="day streak" />
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.cardWrap}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Keyed per grade (not just card id) so an Again card re-entering
                later still animates in like a fresh card. */}
            <Animated.View
              key={`${currentCard.id}-${session.stats.reviewed}`}
              entering={FadeInRight.duration(280)}>
              <ReviewCard
                card={currentCard}
                onReveal={session.reveal}
                onGrade={session.grade}
                onToggleFavorite={session.toggleFavorite}
                onNoteChange={session.updateNote}
                onNoteFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
              />
            </Animated.View>
          </ScrollView>

          {session.revealed && currentCard.type !== 'multiple-choice' && (
            <GradeButtons card={currentCard} onGrade={session.grade} suggestedGrade={session.suggestedGrade} />
          )}
        </KeyboardAvoidingView>
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressWrap: {
    flex: 1,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  topicPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  cardWrap: {
    flexGrow: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
});
