import { describe, expect, it } from 'vitest';

import { cardToEntry, filterEntries } from './reference';

function makeCard(overrides = {}) {
  return {
    id: 'groupby_basic',
    topic: 'groupby',
    subtopic: 'aggregation',
    tags: ['aggregation'],
    whenToUse: 'Summarising a metric across categories.',
    answer: "df.groupby('region')['revenue'].sum()",
    why: 'Selecting the column first keeps the result a Series.',
    commonMistake: 'Aggregating the whole DataFrame.',
    example: '# West 120',
    relatedMethods: ['sum', 'agg'],
    ...overrides,
  };
}

describe('cardToEntry', () => {
  it('titles the entry after the first related method', () => {
    const entry = cardToEntry(makeCard());
    expect(entry.title).toBe('sum');
  });

  it('falls back to subtopic when there are no related methods', () => {
    const entry = cardToEntry(makeCard({ relatedMethods: [] }));
    expect(entry.title).toBe('aggregation');
  });
});

describe('filterEntries', () => {
  const entries = [
    cardToEntry(makeCard({ id: 'a', relatedMethods: ['sum', 'agg'], subtopic: 'aggregation', topic: 'groupby' })),
    cardToEntry(makeCard({ id: 'b', relatedMethods: ['merge'], subtopic: 'merge', topic: 'merging', tags: ['merge'] })),
  ];

  it('returns everything for an empty query', () => {
    expect(filterEntries(entries, '')).toHaveLength(2);
    expect(filterEntries(entries, '   ')).toHaveLength(2);
  });

  it('matches case-insensitively against title/topic/tags/relatedMethods', () => {
    expect(filterEntries(entries, 'MERGE')).toEqual([entries[1]]);
    expect(filterEntries(entries, 'groupby')).toEqual([entries[0]]);
  });

  it('returns no matches for an unrelated query', () => {
    expect(filterEntries(entries, 'nonexistent')).toEqual([]);
  });
});
