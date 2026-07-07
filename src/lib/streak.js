import { addDays } from './date';

// Pure streak math — cards.js owns the SQLite reads/writes around these.
// A streak day is earned by doing at least one real review that day (not by
// finishing a whole session), and the chain survives overnight: studying
// yesterday means today can still extend it.

// What the UI should show: the stored count while the chain is alive
// (last study was today or yesterday), 0 once it has lapsed.
export function displayStreak(storedStreak, lastStudyDate, today) {
  if (lastStudyDate !== today && lastStudyDate !== addDays(today, -1)) return 0;
  return storedStreak;
}

// New stored count when a review happens `today`, or null if today already
// counted (callers skip the write).
export function bumpStreak(storedStreak, lastStudyDate, today) {
  if (lastStudyDate === today) return null;
  return lastStudyDate === addDays(today, -1) ? storedStreak + 1 : 1;
}
