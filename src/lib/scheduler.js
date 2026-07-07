import { addDays } from './date';

// Grade = 2 (Again) | 3 (Hard) | 4 (Good) | 5 (Easy)

// Textbook SM-2 only lets grade affect `ef` (which compounds into *future*
// intervals) — for a given `reps` bucket, Hard/Good/Easy all compute the
// identical next interval. That makes the Review screen's three grade
// buttons show the same day-count, which reads as broken next to distinct
// per-button labels. These are Anki-style multipliers applied on top of the
// SM-2 base interval so Hard/Good/Easy diverge immediately, not just after
// several reviews' worth of ef drift.
const HARD_INTERVAL_FACTOR = 0.7;
const EASY_BONUS = 1.5;

export function schedule(card, grade, today) {
  let { ef, interval, reps } = card;
  if (grade >= 3) {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);

    if (grade === 3) interval = Math.max(1, Math.round(interval * HARD_INTERVAL_FACTOR));
    else if (grade === 5) interval = Math.round(interval * EASY_BONUS);

    reps += 1;
  } else {
    reps = 0;
    interval = 1;
  }
  ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (ef < 1.3) ef = 1.3;
  return { ...card, ef, interval, reps, dueDate: addDays(today, interval) };
}

// Runs schedule() for every grade without mutating `card` — used to preview
// the resulting interval for each grade button before the user picks one.
export function previewIntervals(card, today) {
  return {
    2: schedule(card, 2, today),
    3: schedule(card, 3, today),
    4: schedule(card, 4, today),
    5: schedule(card, 5, today),
  };
}
