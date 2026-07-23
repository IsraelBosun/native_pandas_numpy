import { describe, expect, it } from 'vitest';

import { TOPICS, getDeck } from '@/lib/content';

import { buildOptions, buildQuizQueue } from './quiz-pool';

describe('buildQuizQueue', () => {
  it('returns every card in the topic deck that has distractors', () => {
    const topic = TOPICS[0].id;
    const queue = buildQuizQueue(topic, 'seed-1');
    const expectedIds = getDeck(topic)
      .cards.filter((card) => card.distractors?.length > 0)
      .map((card) => card.id)
      .sort();
    expect(queue.map((card) => card.id).sort()).toEqual(expectedIds);
  });

  it('is deterministic for the same seed', () => {
    const topic = TOPICS[0].id;
    const a = buildQuizQueue(topic, 'seed-1').map((card) => card.id);
    const b = buildQuizQueue(topic, 'seed-1').map((card) => card.id);
    expect(a).toEqual(b);
  });

  it('every content deck has at least one quiz-eligible card', () => {
    for (const topic of TOPICS) {
      expect(buildQuizQueue(topic.id, 'audit').length).toBeGreaterThan(0);
    }
  });
});

describe('buildOptions', () => {
  it('includes the answer plus every distractor, nothing else', () => {
    const card = { id: 'x', answer: 'a', distractors: ['b', 'c', 'd'] };
    const options = buildOptions(card);
    expect(options.sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
