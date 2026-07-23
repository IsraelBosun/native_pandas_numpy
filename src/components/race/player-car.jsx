import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { BOTTOM_OFFSET, CAR_HEIGHT, CAR_WIDTH } from './geometry';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BOB_DISTANCE = 6;

// Bound to the engine's `playerX`/`invulnerable`/`paused` shared values —
// left position tracks lane switches, opacity dims during the post-hit
// invulnerability window, and a small idle bob reads as "still alive" while
// the frame loop is paused for a quiz.
export function PlayerCar({ engine, trackHeight }) {
  const theme = useTheme();
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
  }, [bob]);

  const animatedStyle = useAnimatedStyle(() => {
    const bobOffset = engine.paused.value ? bob.value * BOB_DISTANCE : 0;
    return {
      left: engine.playerX.value - CAR_WIDTH / 2,
      opacity: engine.invulnerable.value ? 0.5 : 1,
      transform: [{ translateY: -bobOffset }],
    };
  });

  const top = trackHeight - BOTTOM_OFFSET - CAR_HEIGHT / 2;

  return (
    <Animated.View style={[styles.car, animatedStyle, { top, backgroundColor: theme.action }]}>
      <Animated.View style={[styles.windshield, { backgroundColor: theme.background }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  car: {
    position: 'absolute',
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  windshield: {
    marginTop: 10,
    width: CAR_WIDTH * 0.55,
    height: CAR_HEIGHT * 0.3,
    borderRadius: Radius.sm,
    opacity: 0.6,
  },
});
