import { describe, expect, it } from 'vitest';
import { schedule, previewIntervals } from './scheduler';

const freshCard = { ef: 2.5, interval: 0, reps: 0 };

describe('schedule', () => {
  it('fresh card graded Good x3 -> intervals 1 -> 6 -> ~15', () => {
    let card = freshCard;
    card = schedule(card, 4, '2026-01-01');
    expect(card.interval).toBe(1);
    expect(card.reps).toBe(1);

    card = schedule(card, 4, card.dueDate);
    expect(card.interval).toBe(6);
    expect(card.reps).toBe(2);

    card = schedule(card, 4, card.dueDate);
    expect(card.interval).toBe(15); // round(6 * 2.5), ef stays 2.5 across Good grades
    expect(card.reps).toBe(3);
  });

  it('keeps ef unchanged after Good (grade=4)', () => {
    const card = schedule(freshCard, 4, '2026-01-01');
    expect(card.ef).toBe(2.5);
  });

  it('graded Again resets reps to 0 and interval to 1', () => {
    const learnedCard = { ef: 2.5, interval: 15, reps: 3 };
    const card = schedule(learnedCard, 2, '2026-01-01');
    expect(card.reps).toBe(0);
    expect(card.interval).toBe(1);
    expect(card.dueDate).toBe('2026-01-02');
  });

  it('floors ef at 1.3 after repeated Agains', () => {
    let card = freshCard;
    for (let i = 0; i < 20; i++) {
      card = schedule(card, 2, '2026-01-01');
    }
    expect(card.ef).toBe(1.3);
  });
});

describe('previewIntervals', () => {
  it('returns 4 distinct results and does not mutate the input card', () => {
    const card = { ef: 2.5, interval: 6, reps: 2 };
    const snapshot = { ...card };

    const previews = previewIntervals(card, '2026-01-01');

    expect(Object.keys(previews).sort()).toEqual(['2', '3', '4', '5']);
    expect(new Set(Object.values(previews).map((p) => p.dueDate)).size).toBe(4);
    expect(card).toEqual(snapshot);
  });
});
