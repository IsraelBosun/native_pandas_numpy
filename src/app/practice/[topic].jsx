import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress-bar';
import { ReviewCard } from '@/components/review/review-card';
import { SessionSummary } from '@/components/session-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCramSession } from '@/hooks/use-cram-session';
import { useTheme } from '@/hooks/use-theme';
import { TOPICS } from '@/lib/content';

export default function PracticeDrillScreen() {
  const { topic } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const session = useCramSession({ topic });
  const scrollRef = useRef(null);

  if (session.complete) {
    return (
      <SessionSummary
        reviewed={session.stats.reviewed}
        missed={session.stats.missed}
        onDone={() => router.back()}
      />
    );
  }

  const { currentCard } = session;
  const topicLabel = TOPICS.find((t) => t.id === currentCard.topic)?.label;

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

        <ThemedView type="backgroundSelected" style={styles.topicPill}>
          <ThemedText type="smallBold">{topicLabel} · Practice</ThemedText>
        </ThemedView>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.cardWrap}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <ReviewCard
              key={currentCard.id}
              card={currentCard}
              revealed={session.revealed}
              onReveal={session.reveal}
              onGrade={session.grade}
              onInputFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
            />
          </ScrollView>

          {session.revealed && currentCard.type !== 'multiple-choice' && (
            <SelfCheckButtons onGrade={session.grade} />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

// Cram cards aren't scheduled, so the 4-grade SM-2 interval preview would be
// meaningless here — just a plain correct/missed self-check instead.
function SelfCheckButtons({ onGrade }) {
  const theme = useTheme();

  return (
    <View style={styles.selfCheckRow}>
      <Pressable
        onPress={() => onGrade(2)}
        style={({ pressed }) => [
          styles.selfCheckButton,
          { borderColor: theme.danger },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={{ color: theme.danger }}>
          Missed it
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onGrade(4)}
        style={({ pressed }) => [
          styles.selfCheckButton,
          { borderColor: theme.success },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="smallBold" style={{ color: theme.success }}>
          Got it
        </ThemedText>
      </Pressable>
    </View>
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
  topicPill: {
    alignSelf: 'flex-start',
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
  selfCheckRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  selfCheckButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
