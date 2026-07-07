import { describe, expect, it } from 'vitest';
import { addDays } from './date';

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-01-01', 5)).toBe('2026-01-06');
  });

  it('rolls over a month boundary', () => {
    expect(addDays('2026-01-28', 5)).toBe('2026-02-02');
  });

  it('rolls over a year boundary', () => {
    expect(addDays('2025-12-30', 5)).toBe('2026-01-04');
  });

  it('handles Feb 29 on a leap year', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
  });

  it('handles negative days', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});
