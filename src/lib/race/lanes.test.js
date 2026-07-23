import { describe, expect, it } from 'vitest';

import { LANE_COUNT, clampLaneIndex, laneCenterX } from './lanes';

describe('clampLaneIndex', () => {
  it('clamps below 0 to 0', () => {
    expect(clampLaneIndex(-1)).toBe(0);
    expect(clampLaneIndex(-5)).toBe(0);
  });

  it('clamps above LANE_COUNT - 1 to LANE_COUNT - 1', () => {
    expect(clampLaneIndex(LANE_COUNT)).toBe(LANE_COUNT - 1);
    expect(clampLaneIndex(99)).toBe(LANE_COUNT - 1);
  });

  it('passes through valid indices unchanged', () => {
    for (let i = 0; i < LANE_COUNT; i++) expect(clampLaneIndex(i)).toBe(i);
  });
});

describe('laneCenterX', () => {
  it('centers the middle lane at the track midpoint for an odd lane count', () => {
    expect(laneCenterX(1, 300)).toBe(150);
  });

  it('centers the first and last lanes within their own thirds', () => {
    expect(laneCenterX(0, 300)).toBe(50);
    expect(laneCenterX(2, 300)).toBe(250);
  });
});
