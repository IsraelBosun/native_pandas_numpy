import { describe, expect, it } from 'vitest';

import { buildAchievements, evaluateAchievements } from './achievements';

const TOPICS = [
  { id: 'intro', label: 'Introduction', subject: 'pandas', hue: 'blue', icon: 'compass' },
  { id: 'merging', label: 'Merging', subject: 'pandas', hue: 'blue', icon: 'git-merge' },
  { id: 'numpy-basics', label: 'NumPy', subject: 'numpy', hue: 'pink', icon: 'cpu' },
];

describe('buildAchievements', () => {
  it('generates one topic-master entry per topic, using the topic label', () => {
    const catalog = buildAchievements(TOPICS);
    expect(catalog.find((a) => a.id === 'topic-master:merging').title).toBe('Merging Master');
    expect(catalog.find((a) => a.id === 'topic-master:numpy-basics').title).toBe('NumPy Master');
  });

  it('generates one subject-wizard entry per distinct subject', () => {
    const catalog = buildAchievements(TOPICS);
    const ids = catalog.filter((a) => a.id.startsWith('subject-wizard:')).map((a) => a.id);
    expect(ids.sort()).toEqual(['subject-wizard:numpy', 'subject-wizard:pandas']);
    expect(catalog.find((a) => a.id === 'subject-wizard:numpy').title).toBe('Numpy Wizard');
  });

  it('includes milestone, streak, and perfect-session entries', () => {
    const ids = buildAchievements(TOPICS).map((a) => a.id);
    expect(ids).toContain('reviews:1');
    expect(ids).toContain('reviews:500');
    expect(ids).toContain('streak:7');
    expect(ids).toContain('perfect-session');
  });

  it('never produces duplicate ids', () => {
    const ids = buildAchievements(TOPICS).map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('evaluateAchievements', () => {
  function fullMastery() {
    return new Map(TOPICS.map((t) => [t.id, 100]));
  }

  it('unlocks review milestones at or above the threshold, not below', () => {
    const qualifying = evaluateAchievements(TOPICS, {
      totalReviews: 10,
      streak: 0,
      topicMastery: new Map(),
      perfectSession: false,
    });
    expect(qualifying.has('reviews:1')).toBe(true);
    expect(qualifying.has('reviews:10')).toBe(true);
    expect(qualifying.has('reviews:100')).toBe(false);
  });

  it('unlocks streak milestones at or above the threshold', () => {
    const qualifying = evaluateAchievements(TOPICS, {
      totalReviews: 0,
      streak: 7,
      topicMastery: new Map(),
      perfectSession: false,
    });
    expect(qualifying.has('streak:3')).toBe(true);
    expect(qualifying.has('streak:7')).toBe(true);
    expect(qualifying.has('streak:30')).toBe(false);
  });

  it('only unlocks perfect-session when the flag is passed true', () => {
    const withoutFlag = evaluateAchievements(TOPICS, {
      totalReviews: 0,
      streak: 0,
      topicMastery: new Map(),
      perfectSession: false,
    });
    const withFlag = evaluateAchievements(TOPICS, {
      totalReviews: 0,
      streak: 0,
      topicMastery: new Map(),
      perfectSession: true,
    });
    expect(withoutFlag.has('perfect-session')).toBe(false);
    expect(withFlag.has('perfect-session')).toBe(true);
  });

  it('unlocks a topic-master entry only once that topic hits 100', () => {
    const topicMastery = new Map([['intro', 99], ['merging', 100], ['numpy-basics', 0]]);
    const qualifying = evaluateAchievements(TOPICS, {
      totalReviews: 0,
      streak: 0,
      topicMastery,
      perfectSession: false,
    });
    expect(qualifying.has('topic-master:intro')).toBe(false);
    expect(qualifying.has('topic-master:merging')).toBe(true);
    expect(qualifying.has('topic-master:numpy-basics')).toBe(false);
  });

  it('unlocks subject-wizard only when every topic in that subject is mastered', () => {
    const partial = new Map([['intro', 100], ['merging', 99], ['numpy-basics', 100]]);
    const qualifyingPartial = evaluateAchievements(TOPICS, {
      totalReviews: 0,
      streak: 0,
      topicMastery: partial,
      perfectSession: false,
    });
    expect(qualifyingPartial.has('subject-wizard:pandas')).toBe(false);
    expect(qualifyingPartial.has('subject-wizard:numpy')).toBe(true);

    const qualifyingFull = evaluateAchievements(TOPICS, {
      totalReviews: 0,
      streak: 0,
      topicMastery: fullMastery(),
      perfectSession: false,
    });
    expect(qualifyingFull.has('subject-wizard:pandas')).toBe(true);
    expect(qualifyingFull.has('subject-wizard:numpy')).toBe(true);
  });

  it('treats a topic missing from topicMastery as 0%, not mastered', () => {
    const qualifying = evaluateAchievements(TOPICS, {
      totalReviews: 0,
      streak: 0,
      topicMastery: new Map(),
      perfectSession: false,
    });
    expect(qualifying.has('topic-master:intro')).toBe(false);
    expect(qualifying.has('subject-wizard:pandas')).toBe(false);
  });
});
