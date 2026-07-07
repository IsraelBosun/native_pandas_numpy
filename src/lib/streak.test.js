import { describe, expect, it } from 'vitest';

import { bumpStreak, displayStreak } from './streak';

describe('displayStreak', () => {
  it('shows the stored count when last study was today', () => {
    expect(displayStreak(5, '2026-07-07', '2026-07-07')).toBe(5);
  });

  it('shows the stored count when last study was yesterday (still extendable)', () => {
    expect(displayStreak(5, '2026-07-06', '2026-07-07')).toBe(5);
  });

  it('shows 0 once the chain has lapsed', () => {
    expect(displayStreak(5, '2026-07-04', '2026-07-07')).toBe(0);
  });

  it('shows 0 before any study', () => {
    expect(displayStreak(0, null, '2026-07-07')).toBe(0);
  });

  it('handles month boundaries', () => {
    expect(displayStreak(3, '2026-06-30', '2026-07-01')).toBe(3);
  });
});

describe('bumpStreak', () => {
  it('returns null when today already counted', () => {
    expect(bumpStreak(5, '2026-07-07', '2026-07-07')).toBeNull();
  });

  it('extends the chain when last study was yesterday', () => {
    expect(bumpStreak(5, '2026-07-06', '2026-07-07')).toBe(6);
  });

  it('restarts at 1 after a lapse', () => {
    expect(bumpStreak(5, '2026-07-01', '2026-07-07')).toBe(1);
  });

  it('starts at 1 on the very first review', () => {
    expect(bumpStreak(0, null, '2026-07-07')).toBe(1);
  });

  it('extends across month boundaries', () => {
    expect(bumpStreak(9, '2026-06-30', '2026-07-01')).toBe(10);
  });
});
