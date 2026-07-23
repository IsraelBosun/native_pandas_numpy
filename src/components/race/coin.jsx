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

import { useTopicHues } from '@/hooks/use-theme';
import { travelDurationForSpeed } from '@/lib/race/difficulty';
import { laneCenterX } from '@/lib/race/lanes';

// Same travel/collision-band mechanics as Obstacle, mirrored rather than
// shared via a generic "Entity" component — the two differ in what a hit
// means (collect vs. crash) and pandas-agnostic game code stays simple
// per-purpose rather than prematurely abstracted.
export function Coin({ lane, trackWidth, trackHeight, speedMultiplier, engine, onCollect, onOffscreen }) {
  const hues = useTopicHues();
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
      if (withinBand && lane === engine.playerLane.value) {
        hasTriggered.value = true;
        runOnJS(onCollect)();
      }
    }
  );

  const animatedStyle = useAnimatedStyle(() => ({
    top: y.value,
    left: x,
  }));

  return (
    <Animated.View style={[styles.entity, animatedStyle, { backgroundColor: hues.amber.surface }]}>
      <Feather name="dollar-sign" size={20} color={hues.amber.fg} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entity: {
    position: 'absolute',
    width: LANE_ENTITY_SIZE,
    height: LANE_ENTITY_SIZE,
    borderRadius: LANE_ENTITY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
