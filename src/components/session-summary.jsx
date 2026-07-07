import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScalePressable, triggerHaptic } from '@/components/scale-pressable';
import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useTopicHues } from '@/hooks/use-theme';

// Numbers roll up to their value over this long — short enough to finish
// before the eye settles, long enough to register as movement.
const COUNT_UP_MS = 700;

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

export function SessionSummary({ reviewed, missed, streak, onDone }) {
  const theme = useTheme();
  const hues = useTopicHues();
  const retention = reviewed > 0 ? Math.round(((reviewed - missed) / reviewed) * 100) : 0;

  const reviewedShown = useCountUp(reviewed);
  const missedShown = useCountUp(missed);
  const retentionShown = useCountUp(retention);

  // This screen *is* the celebration — one success buzz as it lands.
  useEffect(() => {
    triggerHaptic('success');
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          entering={ZoomIn.duration(400).springify().damping(12)}
          style={[styles.badge, { backgroundColor: hues.green.surface }]}>
          <Feather name="check" size={36} color={theme.success} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <ThemedText type="title" style={styles.title}>
            Session complete
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(300)} style={styles.statsRow}>
          <Stat label="Reviewed" value={reviewedShown} />
          <Stat label="Missed" value={missedShown} />
          <Stat
            label="Retention"
            value={`${retentionShown}%`}
            color={retention >= 80 ? theme.success : undefined}
          />
        </Animated.View>

        {streak != null && (
          <Animated.View entering={FadeInUp.delay(340).duration(300)}>
            <StreakPill days={streak} label="day streak" />
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(420).duration(300)} style={styles.buttonWrap}>
          <ScalePressable onPress={onDone} haptic="light" scaleTo={0.97}>
            <View style={[styles.button, { backgroundColor: theme.action }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                Back to Home
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
    fontWeight: '800',
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
