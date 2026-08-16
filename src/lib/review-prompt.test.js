import { describe, expect, it } from 'vitest';

import { REVIEW_PROMPT_LIMITS, shouldRequestReview } from './review-prompt';

const TODAY = '2026-08-16';

function ask(overrides = {}) {
  return shouldRequestReview({
    perfectSession: true,
    totalReviews: REVIEW_PROMPT_LIMITS.MIN_REVIEWS,
    attempts: 0,
    lastAskDate: null,
    today: TODAY,
    ...overrides,
  });
}

describe('shouldRequestReview', () => {
  it('asks after a perfect session once the app has proved itself', () => {
    expect(ask()).toBe(true);
  });

  it('never asks after an imperfect session', () => {
    // The whole point of the trigger: a prompt after a session they struggled
    // with is how an app earns a 2-star review.
    expect(ask({ perfectSession: false })).toBe(false);
  });

  it('waits until the user has real history', () => {
    expect(ask({ totalReviews: REVIEW_PROMPT_LIMITS.MIN_REVIEWS - 1 })).toBe(false);
  });

  it('stops after the lifetime cap', () => {
    expect(ask({ attempts: REVIEW_PROMPT_LIMITS.MAX_ATTEMPTS })).toBe(false);
  });

  it('respects the gap between asks', () => {
    expect(ask({ attempts: 1, lastAskDate: '2026-08-01' })).toBe(false);
  });

  it('asks again once the gap has passed', () => {
    expect(ask({ attempts: 1, lastAskDate: '2026-01-01' })).toBe(true);
  });

  // 2026-06-17 + 60 days === today: the full gap has elapsed, so this is the
  // first day asking again is allowed. One day later is still inside it.
  it('allows the ask on the day the gap completes', () => {
    expect(ask({ attempts: 1, lastAskDate: '2026-06-17' })).toBe(true);
  });

  it('blocks the day before the gap completes', () => {
    expect(ask({ attempts: 1, lastAskDate: '2026-06-18' })).toBe(false);
  });
});
