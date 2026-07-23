import { useCallback, useEffect, useRef } from 'react';
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { spawnIntervalForDistance } from '@/lib/race/difficulty';
import { LANE_COUNT, clampLaneIndex, laneCenterX } from '@/lib/race/lanes';
import {
  BOOST_DURATION_MS,
  BOOST_MULTIPLIER,
  INVULNERABILITY_MS,
  SLOWDOWN_DURATION_MS,
  SLOWDOWN_MULTIPLIER,
  nextQuizThreshold,
} from '@/lib/race/scoring';

// "World units" per second at 1x speed — arbitrary but consistent with the
// spawn-interval/distance constants in lib/race/difficulty.js and scoring.js.
const BASE_DISTANCE_PER_SECOND = 140;
const CENTER_LANE = Math.floor(LANE_COUNT / 2);
const LANE_SWITCH_DURATION_MS = 180;
// Ramp up/down at the edges of a boost/slowdown so the speed change reads as
// a burst rather than a jump-cut; the middle segment holds the full effect.
const SPEED_EASE_MS = 250;

// Owns every UI-thread animation primitive for Race mode (player position,
// distance/spawn/quiz timing, speed effects). Nothing here touches React
// state or SQLite — discrete gameplay events (spawn, quiz trigger) are
// surfaced to the caller via plain JS callback props, invoked with runOnJS.
export function useRaceEngine({ trackWidth, onSpawn, onQuizTrigger }) {
  const playerLane = useSharedValue(CENTER_LANE);
  const playerX = useSharedValue(laneCenterX(CENTER_LANE, trackWidth || 0));
  const distance = useSharedValue(0);
  const speedMultiplier = useSharedValue(1);
  const paused = useSharedValue(false);
  const invulnerable = useSharedValue(false);

  const nextSpawnDistance = useSharedValue(0);
  const nextQuizDistance = useSharedValue(nextQuizThreshold(0));

  const invulnerableTimeoutRef = useRef(null);

  // Refs so the frame-callback worklet always invokes the latest callback
  // without needing to re-register the frame callback every render.
  const onSpawnRef = useRef(onSpawn);
  const onQuizTriggerRef = useRef(onQuizTrigger);
  onSpawnRef.current = onSpawn;
  onQuizTriggerRef.current = onQuizTrigger;

  const invokeSpawn = useCallback(() => onSpawnRef.current?.(), []);
  const invokeQuizTrigger = useCallback(() => onQuizTriggerRef.current?.(), []);

  const frame = useFrameCallback((frameInfo) => {
    'worklet';
    if (paused.value) return;
    const dt = frameInfo.timeSincePreviousFrame;
    if (!dt) return;

    distance.value += (dt / 1000) * BASE_DISTANCE_PER_SECOND * speedMultiplier.value;

    if (distance.value >= nextSpawnDistance.value) {
      const gapMs = spawnIntervalForDistance(distance.value);
      nextSpawnDistance.value = distance.value + (gapMs / 1000) * BASE_DISTANCE_PER_SECOND;
      runOnJS(invokeSpawn)();
    }

    if (distance.value >= nextQuizDistance.value) {
      nextQuizDistance.value = nextQuizThreshold(distance.value);
      runOnJS(invokeQuizTrigger)();
    }
  });

  useEffect(() => {
    return () => {
      if (invulnerableTimeoutRef.current) clearTimeout(invulnerableTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // Re-center on track-width changes (e.g. orientation change) without
    // animating — a resize shouldn't read as a lane-change.
    if (trackWidth) playerX.value = laneCenterX(playerLane.value, trackWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackWidth]);

  const shiftLane = useCallback(
    (direction) => {
      const next = clampLaneIndex(playerLane.value + direction);
      if (next === playerLane.value) return;
      playerLane.value = next;
      playerX.value = withTiming(laneCenterX(next, trackWidth || 0), {
        duration: LANE_SWITCH_DURATION_MS,
      });
    },
    [playerLane, playerX, trackWidth]
  );

  const applyBoost = useCallback(() => {
    speedMultiplier.value = withSequence(
      withTiming(BOOST_MULTIPLIER, { duration: SPEED_EASE_MS }),
      withTiming(BOOST_MULTIPLIER, { duration: BOOST_DURATION_MS - SPEED_EASE_MS * 2 }),
      withTiming(1, { duration: SPEED_EASE_MS })
    );
  }, [speedMultiplier]);

  const applySlowdown = useCallback(() => {
    speedMultiplier.value = withSequence(
      withTiming(SLOWDOWN_MULTIPLIER, { duration: SPEED_EASE_MS }),
      withTiming(SLOWDOWN_MULTIPLIER, { duration: SLOWDOWN_DURATION_MS - SPEED_EASE_MS * 2 }),
      withTiming(1, { duration: SPEED_EASE_MS })
    );
  }, [speedMultiplier]);

  const triggerInvulnerability = useCallback(() => {
    invulnerable.value = true;
    if (invulnerableTimeoutRef.current) clearTimeout(invulnerableTimeoutRef.current);
    invulnerableTimeoutRef.current = setTimeout(() => {
      invulnerable.value = false;
    }, INVULNERABILITY_MS);
  }, [invulnerable]);

  const pauseForQuiz = useCallback(() => {
    paused.value = true;
  }, [paused]);

  const resumeFromQuiz = useCallback(() => {
    paused.value = false;
  }, [paused]);

  // Fully stops the frame loop (game over / unmount) — distinct from
  // paused, which only pauses spawning/distance during a quiz interrupt.
  const stop = useCallback(() => {
    paused.value = true;
    frame.setActive(false);
  }, [frame, paused]);

  const getDistance = useCallback(() => distance.value, [distance]);

  return {
    playerLane,
    playerX,
    distance,
    speedMultiplier,
    paused,
    invulnerable,
    shiftLane,
    applyBoost,
    applySlowdown,
    triggerInvulnerability,
    pauseForQuiz,
    resumeFromQuiz,
    stop,
    getDistance,
  };
}
