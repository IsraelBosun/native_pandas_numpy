import { describe, expect, it } from 'vitest';

import { CHALLENGES, getChallenge } from './challenges';

// Structural integrity of challenge content. The pandas *correctness* of
// tableStates is verified separately by scripts/verify_challenges.py — this
// covers everything the app's runner depends on at render time.
describe('challenge content', () => {
  it('has unique challenge ids', () => {
    const ids = CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getChallenge finds by id', () => {
    expect(getChallenge('clean_sales_log')?.title).toBe('Clean the sales log');
    expect(getChallenge('nope')).toBeUndefined();
  });

  for (const challenge of CHALLENGES) {
    describe(challenge.id, () => {
      it('has the metadata the tiles and intro render', () => {
        expect(challenge.title).toBeTruthy();
        expect(challenge.goal).toBeTruthy();
        expect(challenge.datasetName).toBeTruthy();
        expect(challenge.minutes).toBeGreaterThan(0);
        expect(challenge.steps.length).toBeGreaterThan(0);
        expect(challenge.tableStates.step0).toBeDefined();
      });

      it('every step is well-formed', () => {
        const stepIds = challenge.steps.map((s) => s.id);
        expect(new Set(stepIds).size).toBe(stepIds.length);

        for (const step of challenge.steps) {
          expect(['fill-blank', 'multiple-choice']).toContain(step.type);
          expect(step.prompt).toBeTruthy();
          expect(step.why).toBeTruthy();
          expect(step.distractors.length).toBeGreaterThanOrEqual(2);

          if (step.type === 'fill-blank') {
            expect(step.starterCode).toContain('___');
            expect(step.tokens.length).toBeGreaterThanOrEqual(1);
            expect(step.distractors).not.toContain(step.tokens[0]);
          } else {
            expect(step.answer).toBeTruthy();
            expect(step.distractors).not.toContain(step.answer);
          }
        }
      });

      it('table references resolve and chain in pipeline order', () => {
        let currentState = 'step0';
        for (const step of challenge.steps) {
          expect(challenge.tableStates[step.table]).toBeDefined();
          expect(step.table).toBe(currentState);

          if (step.tableAfter) {
            expect(challenge.tableStates[step.tableAfter]).toBeDefined();
            expect(step.codeLine).toBeTruthy();
            currentState = step.tableAfter;
          }
        }
      });
    });
  }
});
