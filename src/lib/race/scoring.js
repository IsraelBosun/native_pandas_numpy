// Tunable constants for Race mode — kept as named constants in one place so
// balance changes don't require hunting through component/hook code.
export const STARTING_LIVES = 3;
export const INVULNERABILITY_MS = 1200;

export const BOOST_MULTIPLIER = 1.5;
export const BOOST_DURATION_MS = 4000;

export const SLOWDOWN_MULTIPLIER = 0.6;
export const SLOWDOWN_DURATION_MS = 4000;

export const CORRECT_COIN_BONUS = 5;

export const QUIZ_INTERVAL_MIN_DISTANCE = 900;
export const QUIZ_INTERVAL_MAX_DISTANCE = 1500;

export function scoreForDistance(distance) {
  return Math.round(distance);
}

// Random next quiz-trigger threshold, distance-based so cadence scales with
// how far the player has gotten rather than how long they've been playing
// (speed boosts/slowdowns already make elapsed time a moving target).
export function nextQuizThreshold(currentDistance) {
  'worklet';
  const span = QUIZ_INTERVAL_MAX_DISTANCE - QUIZ_INTERVAL_MIN_DISTANCE;
  return currentDistance + QUIZ_INTERVAL_MIN_DISTANCE + Math.random() * span;
}
