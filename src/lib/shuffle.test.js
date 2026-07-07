import { describe, expect, it } from 'vitest';

import { seededShuffle } from './shuffle';

describe('seededShuffle', () => {
  it('is deterministic for the same seed', () => {
    const a = seededShuffle(['a', 'b', 'c', 'd'], 'card_1');
    const b = seededShuffle(['a', 'b', 'c', 'd'], 'card_1');
    expect(a).toEqual(b);
  });

  it('produces a different order for a different seed', () => {
    const a = seededShuffle(['a', 'b', 'c', 'd', 'e'], 'card_1');
    const b = seededShuffle(['a', 'b', 'c', 'd', 'e'], 'card_2');
    expect(a).not.toEqual(b);
  });

  it('contains exactly the same elements as the input', () => {
    const input = ['a', 'b', 'c', 'd'];
    const result = seededShuffle(input, 'card_2');
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    seededShuffle(input, 'seed');
    expect(input).toEqual(['a', 'b', 'c']);
  });
});
