// Pure policy for when to ask for a Play Store rating. No DB, no native
// module, no Date.now() — same discipline as scheduler.js and reminders.js.
// lib/store-review.js reads the state and performs the actual request.
//
// Google's In-App Review API is quota-limited (a few prompts per user per
// year) and deliberately gives NO callback saying whether the user rated,
// dismissed, or even saw it. So attempts are scarce and their outcome is
// invisible: the only thing we control is picking a good moment, and not
// burning attempts on bad ones.

import { addDays } from './date';

// Enough sessions that the app has proved itself. Asking a new user to rate
// something they have barely used is how you buy a 2-star review.
const MIN_REVIEWS = 40;

// Never twice in the same stretch — Google would silently swallow the second
// one anyway, and we would have spent our own bookkeeping on nothing.
const DAYS_BETWEEN_ASKS = 60;

// Total lifetime attempts. Past this we stop asking: someone who has ignored
// three prompts has answered.
const MAX_ATTEMPTS = 3;

/**
 * Should we request a store review right now?
 *
 * Called at the end of a session, and only ever for a *perfect* one — the
 * peak moment, where the user has just got everything right. A prompt after a
 * session they struggled with converts badly and earns a low rating.
 *
 * @param {object} input
 * @param {boolean} input.perfectSession  every card in the session graded correct
 * @param {number} input.totalReviews     lifetime reviews on this device
 * @param {number} input.attempts         how many times we have already asked
 * @param {string|null} input.lastAskDate ISO date of the last attempt, or null
 * @param {string} input.today            ISO date
 * @returns {boolean}
 */
export function shouldRequestReview({
  perfectSession,
  totalReviews,
  attempts,
  lastAskDate,
  today,
}) {
  if (!perfectSession) return false;
  if (attempts >= MAX_ATTEMPTS) return false;
  if (totalReviews < MIN_REVIEWS) return false;
  if (lastAskDate && addDays(lastAskDate, DAYS_BETWEEN_ASKS) > today) return false;
  return true;
}

export const REVIEW_PROMPT_LIMITS = { MIN_REVIEWS, DAYS_BETWEEN_ASKS, MAX_ATTEMPTS };
