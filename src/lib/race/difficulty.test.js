import { describe, expect, it } from 'vitest';

import { spawnIntervalForDistance, travelDurationForSpeed } from './difficulty';

describe('spawnIntervalForDistance', () => {
  it('starts at the base interval when distance is 0', () => {
    expect(spawnIntervalForDistance(0)).toBe(1400);
  });

  it('shrinks toward the floor as distance grows', () => {
    const near = spawnIntervalForDistance(100);
    const far = spawnIntervalForDistance(3000);
    expect(far).toBeLessThan(near);
    expect(far).toBeGreaterThanOrEqual(650);
  });

  it('never drops below the floor beyond the ramp distance', () => {
    expect(spawnIntervalForDistance(10000)).toBe(650);
  });

  it('never exceeds the base interval for negative distance', () => {
    expect(spawnIntervalForDistance(-500)).toBe(1400);
  });
});

describe('travelDurationForSpeed', () => {
  it('returns the base duration at 1x speed', () => {
    expect(travelDurationForSpeed(2000, 1)).toBe(2000);
  });

  it('shortens duration as speed increases', () => {
    expect(travelDurationForSpeed(2000, 2)).toBe(1000);
  });

  it('lengthens duration as speed decreases', () => {
    expect(travelDurationForSpeed(2000, 0.5)).toBe(4000);
  });
});
