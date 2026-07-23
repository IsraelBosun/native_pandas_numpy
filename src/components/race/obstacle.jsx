import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BASE_TRAVEL_DURATION_MS, BOTTOM_OFFSET, LANE_ENTITY_SIZE } from './geometry';

import { useTheme } from '@/hooks/use-theme';
import { travelDurationForSpeed } from '@/lib/race/difficulty';
import { laneCenterX } from '@/lib/race/lanes';

// Owns its own single travel animation (spawn to off-screen), computed once
// at mount from the speed multiplier at spawn time — a boost/slowdown that
// starts mid-flight never retroactively speeds up or slows down obstacles
// already on screen, only ones spawned after it (documented MVP
// simplification, see the plan's "Quiz interrupt mechanics" section).
export function Obstacle({ lane, trackWidth, trackHeight, speedMultiplier, engine, onCollision, onOffscreen }) {
  const theme = useTheme();
  const y = useSharedValue(-LANE_ENTITY_SIZE);
  const hasTriggered = useSharedValue(false);
  const collisionY = trackHeight - BOTTOM_OFFSET;
  const x = laneCenterX(lane, trackWidth) - LANE_ENTITY_SIZE / 2;

  useEffect(() => {
    const duration = travelDurationForSpeed(BASE_TRAVEL_DURATION_MS, speedMultiplier);
    y.value = withTiming(trackHeight + LANE_ENTITY_SIZE, { duration }, (finished) => {
      if (finished) runOnJS(onOffscreen)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAnimatedReaction(
    () => y.value,
    (current) => {
      if (hasTriggered.value || engine.paused.value) return;
      const withinBand = Math.abs(current - collisionY) < LANE_ENTITY_SIZE / 2;
      if (withinBand && lane === engine.playerLane.value && !engine.invulnerable.value) {
        hasTriggered.value = true;
        runOnJS(onCollision)();
      }
    }
  );

  const animatedStyle = useAnimatedStyle(() => ({
    top: y.value,
    left: x,
  }));

  return (
    <Animated.View style={[styles.entity, animatedStyle, { backgroundColor: theme.dangerMuted }]}>
      <Feather name="alert-triangle" size={22} color={theme.danger} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entity: {
    position: 'absolute',
    width: LANE_ENTITY_SIZE,
    height: LANE_ENTITY_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
