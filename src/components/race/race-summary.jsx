import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScalePressable, triggerHaptic } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useTopicHues } from '@/hooks/use-theme';

const COUNT_UP_MS = 700;

// Forked from components/session-summary.jsx (same count-up/ZoomIn/stagger
// shell) rather than generalized — Race mode's stat set (score/coins/quiz
// accuracy) has nothing to do with the graded-review summary, and forking
// keeps that component's real SM-2 path untouched by race-only changes.
function useCountUp(target) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let frame;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / COUNT_UP_MS, 1);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

export function RaceSummary({ score, coins, quizStats, onDone }) {
  const theme = useTheme();
  const hues = useTopicHues();
  const accuracy = quizStats.attempted > 0 ? Math.round((quizStats.correct / quizStats.attempted) * 100) : 0;

  const scoreShown = useCountUp(score);
  const coinsShown = useCountUp(coins);
  const accuracyShown = useCountUp(accuracy);

  useEffect(() => {
    triggerHaptic('success');
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          entering={ZoomIn.duration(400).springify().damping(12)}
          style={[styles.badge, { backgroundColor: hues.blue.surface }]}>
          <Feather name="flag" size={36} color={hues.blue.fg} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <ThemedText type="title" style={styles.title}>
            Race over
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(300)} style={styles.statsRow}>
          <Stat label="Score" value={scoreShown} />
          <Stat label="Coins" value={coinsShown} />
          <Stat label="Quiz accuracy" value={`${accuracyShown}%`} color={accuracy >= 80 ? theme.success : undefined} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(300)}>
          <ThemedText themeColor="textSecondary" type="small">
            {quizStats.correct}/{quizStats.attempted} pandas questions correct
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(420).duration(300)} style={styles.buttonWrap}>
          <ScalePressable onPress={onDone} haptic="light" scaleTo={0.97}>
            <View style={[styles.button, { backgroundColor: theme.action }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Back to Practice
              </ThemedText>
            </View>
          </ScalePressable>
        </Animated.View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="title" style={[styles.statValue, color && { color }]}>
        {value}
      </ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.five,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  stat: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  statValue: {
    fontSize: 32,
    lineHeight: 38,
  },
  buttonWrap: {
    alignSelf: 'stretch',
  },
  button: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});
