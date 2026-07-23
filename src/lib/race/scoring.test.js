import { describe, expect, it } from 'vitest';

import {
  QUIZ_INTERVAL_MAX_DISTANCE,
  QUIZ_INTERVAL_MIN_DISTANCE,
  nextQuizThreshold,
  scoreForDistance,
} from './scoring';

describe('scoreForDistance', () => {
  it('rounds distance to the nearest integer score', () => {
    expect(scoreForDistance(120.4)).toBe(120);
    expect(scoreForDistance(120.6)).toBe(121);
  });
});

describe('nextQuizThreshold', () => {
  it('always lands within [current + MIN, current + MAX]', () => {
    for (let i = 0; i < 50; i++) {
      const threshold = nextQuizThreshold(1000);
      expect(threshold).toBeGreaterThanOrEqual(1000 + QUIZ_INTERVAL_MIN_DISTANCE);
      expect(threshold).toBeLessThanOrEqual(1000 + QUIZ_INTERVAL_MAX_DISTANCE);
    }
  });
});
