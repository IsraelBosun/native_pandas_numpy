import { describe, expect, it } from 'vitest';

import { addDays, todayISO } from './date';
import { bucketReviewsByDate, computeRetentionSeries, computeWeakestTopics } from './stats';

const today = todayISO();

function reviewRow(daysAgo, grade) {
  return { reviewed_at: `${addDays(today, -daysAgo)}T12:00:00.000Z`, grade };
}

describe('bucketReviewsByDate', () => {
  it('returns one bucket per day covering the requested window', () => {
    const result = bucketReviewsByDate([], { weeks: 1 });
    expect(result).toHaveLength(7);
    expect(result[6].date).toBe(today);
    expect(result[0].date).toBe(addDays(today, -6));
  });

  it('counts reviews on their correct day', () => {
    const rows = [reviewRow(0, 4), reviewRow(0, 5), reviewRow(3, 2)];
    const result = bucketReviewsByDate(rows, { weeks: 1 });
    const todayBucket = result.find((day) => day.date === today);
    const threeDaysAgoBucket = result.find((day) => day.date === addDays(today, -3));
    expect(todayBucket.count).toBe(2);
    expect(threeDaysAgoBucket.count).toBe(1);
  });

  it('ignores reviews outside the window', () => {
    const rows = [reviewRow(30, 4)];
    const result = bucketReviewsByDate(rows, { weeks: 1 });
    expect(result.reduce((sum, day) => sum + day.count, 0)).toBe(0);
  });
});

describe('computeRetentionSeries', () => {
  it('computes a percentage of grade>=3 reviews per day', () => {
    const rows = [reviewRow(0, 4), reviewRow(0, 2), reviewRow(2, 5)];
    const result = computeRetentionSeries(rows, { days: 3 });

    const todayEntry = result.find((day) => day.date === today);
    const yesterdayEntry = result.find((day) => day.date === addDays(today, -1));
    const twoDaysAgoEntry = result.find((day) => day.date === addDays(today, -2));

    expect(todayEntry.retention).toBe(50);
    expect(yesterdayEntry.retention).toBeNull();
    expect(twoDaysAgoEntry.retention).toBe(100);
  });
});

describe('computeWeakestTopics', () => {
  const topics = [
    { id: 'groupby', label: 'GroupBy' },
    { id: 'merging', label: 'Merging' },
    { id: 'indexing', label: 'Indexing' },
  ];
  const contentById = new Map([
    ['g1', { topic: 'groupby' }],
    ['g2', { topic: 'groupby' }],
    ['m1', { topic: 'merging' }],
  ]);

  it('sorts topics by ascending average ease, excluding topics with no reviewed cards', () => {
    const rows = [
      { card_id: 'g1', ef: 2.0 },
      { card_id: 'g2', ef: 3.0 },
      { card_id: 'm1', ef: 1.5 },
    ];
    const result = computeWeakestTopics(rows, contentById, topics, { limit: 5 });
    expect(result.map((topic) => topic.id)).toEqual(['merging', 'groupby']);
    expect(result[0].avgEf).toBe(1.5);
    expect(result[1].avgEf).toBe(2.5);
  });

  it('respects the limit', () => {
    const rows = [
      { card_id: 'g1', ef: 2.0 },
      { card_id: 'm1', ef: 1.5 },
    ];
    const result = computeWeakestTopics(rows, contentById, topics, { limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('merging');
  });
});
