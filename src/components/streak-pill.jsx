import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StreakPill({ days, label }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const prevDays = useRef(days);

  // Pop only when the streak grows (first review of the day lands) — not on
  // mount or when a refresh re-reads the same value.
  useEffect(() => {
    if (days > prevDays.current) {
      scale.value = withSequence(
        withSpring(1.18, { damping: 12, stiffness: 320, mass: 0.6 }),
        withSpring(1, { damping: 16, stiffness: 280, mass: 0.6 })
      );
    }
    prevDays.current = days;
  }, [days, scale]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const alive = days > 0;

  return (
    <Animated.View style={popStyle}>
      <ThemedView type="backgroundElement" style={[styles.pill, { borderColor: theme.border }]}>
        <Ionicons name="flame" size={16} color={alive ? theme.warning : theme.textSecondary} />
        <ThemedText type="smallBold" themeColor={alive ? 'text' : 'textSecondary'}>
          {label ? `${days} ${label}` : days}
        </ThemedText>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
