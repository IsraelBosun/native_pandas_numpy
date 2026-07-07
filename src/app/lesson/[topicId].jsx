import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LessonStep } from '@/components/lesson/lesson-step';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearLessonStep, getLessonStep, markLessonSeen, saveLessonStep } from '@/lib/cards';
import { TOPICS, getLesson } from '@/lib/content';

export default function LessonScreen() {
  const { topicId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const lesson = getLesson(topicId);
  const topic = TOPICS.find((t) => t.id === topicId);
  const steps = lesson?.steps ?? [];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    let cancelled = false;
    getLessonStep(topicId).then((savedStep) => {
      if (cancelled) return;
      setStepIndex(Math.min(savedStep, Math.max(steps.length - 1, 0)));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Steps come from bundled content and don't change across the lesson's
    // lifetime, so re-running this on topicId change alone is enough.
  }, [topicId]);

  async function handleNext() {
    if (isLastStep) {
      await markLessonSeen(topicId);
      await clearLessonStep(topicId);
      router.replace({ pathname: '/review', params: { topic: topicId } });
    } else {
      const next = stepIndex + 1;
      setStepIndex(next);
      saveLessonStep(topicId, next);
    }
  }

  function handleBack() {
    if (stepIndex === 0) {
      router.back();
    } else {
      const prev = stepIndex - 1;
      setStepIndex(prev);
      saveLessonStep(topicId, prev);
    }
  }

  if (loading || !lesson) return null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar progress={(stepIndex + 1) / steps.length} color={theme.action} />
          </View>
        </View>

        <ThemedText type="label" themeColor="textSecondary">
          {topic?.label}
        </ThemedText>

        <View style={styles.content}>
          <LessonStep step={steps[stepIndex]} />
        </View>

        <View style={styles.footer}>
          {stepIndex > 0 && (
            <Pressable onPress={handleBack} style={styles.secondaryButton}>
              <ThemedText type="smallBold">Back</ThemedText>
            </Pressable>
          )}
          <Pressable
            onPress={handleNext}
            style={[styles.primaryButton, { backgroundColor: theme.action }]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              {isLastStep ? 'Start review' : 'Next'}
            </ThemedText>
          </Pressable>
        </View>
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
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressWrap: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  secondaryButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});
