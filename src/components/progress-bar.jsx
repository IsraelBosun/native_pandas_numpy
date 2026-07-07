import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

// The fill animates via scaleX (UI-thread transform, no layout work) so bars
// glide to their value instead of jumping — including the review header bar
// ticking forward per card and mastery bars filling on Home focus.
export function ProgressBar({ progress, color }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(pct, { duration: 550, easing: Easing.out(Easing.cubic) });
  }, [pct, scale]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }));

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: color ?? theme.action }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    transformOrigin: 'left',
  },
});
