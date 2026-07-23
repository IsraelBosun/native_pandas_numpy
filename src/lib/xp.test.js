import { describe, expect, it } from 'vitest';

import { lifetimeXp, xpForGrade } from './xp';

describe('xpForGrade', () => {
  it('maps each grade to its point value', () => {
    expect(xpForGrade(2)).toBe(0); // Again
    expect(xpForGrade(3)).toBe(5); // Hard
    expect(xpForGrade(4)).toBe(10); // Good
    expect(xpForGrade(5)).toBe(15); // Easy
  });

  it('treats an unknown grade as zero', () => {
    expect(xpForGrade(0)).toBe(0);
    expect(xpForGrade(undefined)).toBe(0);
  });
});

describe('lifetimeXp', () => {
  it('sums xp across a log of grades', () => {
    const logs = [{ grade: 4 }, { grade: 5 }, { grade: 2 }, { grade: 3 }];
    expect(lifetimeXp(logs)).toBe(10 + 15 + 0 + 5);
  });

  it('is zero for an empty log', () => {
    expect(lifetimeXp([])).toBe(0);
  });
});
