const BASE_SPAWN_INTERVAL_MS = 1400;
const MIN_SPAWN_INTERVAL_MS = 650;
// Distance (same units as use-race-engine's `distance` accumulator) over
// which the spawn interval ramps from base down to its floor.
const RAMP_DISTANCE = 4000;

// 'worklet' directives below: both functions run inside use-race-engine.js's
// useFrameCallback (UI thread) as well as plain JS thread callers — the
// directive is a Reanimated compile hint only, harmless outside its plugin
// (e.g. under vitest, which doesn't run it).
export function spawnIntervalForDistance(distance) {
  'worklet';
  const progress = Math.min(Math.max(distance, 0) / RAMP_DISTANCE, 1);
  return BASE_SPAWN_INTERVAL_MS - (BASE_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS) * progress;
}

export function travelDurationForSpeed(baseDurationMs, speedMultiplier) {
  'worklet';
  return baseDurationMs / speedMultiplier;
}
