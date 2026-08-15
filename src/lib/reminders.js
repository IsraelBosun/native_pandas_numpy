import { addDays } from './date';

// Pure reminder planning — decides WHAT to send and WHEN, and nothing else.
// No DB, no expo-notifications, no Date.now(): same discipline as scheduler.js
// and merge.js, because a wrong reminder is invisible until users are already
// annoyed by it. lib/notifications.js is the thin layer that books the result.

// How far ahead to plan. iOS caps pending local notifications at 64 and drops
// the excess silently, so a week of one-a-day stays well inside the budget and
// gets rewritten at the end of every session anyway.
export const PLAN_DAYS = 7;

export const DEFAULT_HOUR = 18;

// A lapsing streak is the one thing worth a late nudge — it's a real deadline
// (midnight), not a manufactured one.
const STREAK_RESCUE_HOUR = 20;

// Never fire in someone's night, whatever their study history says.
const QUIET_UNTIL_HOUR = 8;
const QUIET_FROM_HOUR = 21;

// Below this many past sessions, the modal study hour is noise — fall back to
// DEFAULT_HOUR rather than pinning a reminder to one accidental late night.
const MIN_SESSIONS_FOR_LEARNED_HOUR = 5;

// Fire slightly before the hour they usually study, so the reminder arrives as
// a prompt rather than as an interruption to a session already underway.
const LEAD_MINUTES = 30;

function clampToWaking(hour) {
  if (hour < QUIET_UNTIL_HOUR) return QUIET_UNTIL_HOUR;
  if (hour > QUIET_FROM_HOUR) return QUIET_FROM_HOUR;
  return hour;
}

// The hour the user actually studies, by mode of their recent sessions' local
// hour. Mode rather than mean: a single 3am session shouldn't drag a 7pm
// habit down to the small hours, and the mean of a bimodal habit lands in the
// gap where they never study.
export function preferredHour(reviewHours) {
  const hours = (reviewHours ?? []).filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);
  if (hours.length < MIN_SESSIONS_FOR_LEARNED_HOUR) return DEFAULT_HOUR;

  const counts = new Map();
  for (const hour of hours) counts.set(hour, (counts.get(hour) ?? 0) + 1);

  let best = DEFAULT_HOUR;
  let bestCount = 0;
  // Ties break toward the later hour: evening study is the more reliable slot,
  // and Map iteration order here is insertion order, not hour order.
  for (const [hour, count] of counts) {
    if (count > bestCount || (count === bestCount && hour > best)) {
      best = hour;
      bestCount = count;
    }
  }

  const withLead = LEAD_MINUTES > 0 ? best - 1 : best;
  return clampToWaking(withLead);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// Copy varies by day so the reminder doesn't go invisible, and always states a
// real number — "12 cards are due" outperforms "time to review", and it also
// means a reminder can never claim something the app can't back up.
const DUE_COPY = [
  (count) => ({
    title: 'Time to review',
    body: `${plural(count, 'card')} ready when you are.`,
  }),
  (count) => ({
    title: `${plural(count, 'card')} due`,
    body: 'A few minutes now is all it takes.',
  }),
  (count) => ({
    title: 'Your cards are ready',
    body: `${plural(count, 'card')} waiting for a quick pass.`,
  }),
  (count) => ({
    title: 'Keep it going',
    body: `${plural(count, 'card')} due today.`,
  }),
];

// Days since the epoch — a stable rotation index, so consecutive days always
// get different copy (a random pick repeats about a quarter of the time).
function dayIndex(dateISO) {
  const [year, month, day] = dateISO.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function dueMessage(dateISO, count) {
  const pick = DUE_COPY[((dayIndex(dateISO) % DUE_COPY.length) + DUE_COPY.length) % DUE_COPY.length];
  return pick(count);
}

function streakMessage(streak) {
  return {
    title: `Don't lose your ${plural(streak, 'day')} streak`,
    body: 'One review before midnight keeps it alive.',
  };
}

// The win-back ladder, in days since the user last studied.
//
// Everything above only fires while someone is still turning up: the plan is
// rebuilt on launch and at session end, so a user who stops doing both would
// otherwise run off the end of the window and never hear from the app again —
// and that is precisely the user a reminder is for. These are booked at the
// same time as the due-day ones, dated far enough out to cover the silence.
//
// Tapering, and few: four notifications over a month is a nudge, an escalating
// daily drip is why people mute study apps. No guilt, and no invented stakes —
// each line has to be true for the user who receives it.
const LAPSE_LADDER = [3, 7, 14, 30];

function lapseMessage(daysAway, dueCount, streakAtRisk) {
  // A lapsed user's cards are all overdue by now, so the count is real and
  // worth stating — it is the most concrete reason to come back.
  const cards = dueCount > 0 ? `${plural(dueCount, 'card')} waiting` : 'Your cards are waiting';

  if (daysAway <= 3) {
    // Deliberately low-stakes: three days off is a normal week, not a lapse.
    return { title: 'Pick up where you left off', body: `${cards} whenever you have a minute.` };
  }
  if (daysAway <= 7) {
    return streakAtRisk
      ? { title: 'Your streak has ended', body: `${cards} — a few minutes starts a new one.` }
      : { title: 'Still here when you are', body: `${cards}.` };
  }
  if (daysAway <= 14) {
    return {
      title: 'Two weeks since your last review',
      body: 'Spaced repetition works best with a little and often — even five minutes helps.',
    };
  }
  return {
    title: 'Your progress is saved',
    body: 'Everything you learned is still here. Start again whenever you like.',
  };
}

// Books the ladder relative to the LAST STUDY DATE, not to today. Dating it
// from today would push every rung further out each time the app is opened —
// the "3 days away" notification would then never arrive for someone who
// briefly opens the app without studying.
function planLapseReminders({ lastStudyDate, today, hour, minute, overdueCount, streak }) {
  if (!lastStudyDate) return []; // never studied — onboarding's job, not ours
  const plan = [];

  for (const daysAway of LAPSE_LADDER) {
    const date = addDays(lastStudyDate, daysAway);
    if (date <= today) continue; // that rung is already in the past

    // A streak only counts as "at risk" if there was a real one to lose.
    const streakAtRisk = streak > 1;
    plan.push({
      date,
      hour,
      minute,
      ...lapseMessage(daysAway, overdueCount, streakAtRisk),
    });
  }
  return plan;
}

// Counts due cards per day for the planning window, treating anything already
// overdue as due on `today` (that is what the review queue will show).
//
// `dueDates` is every stored card's due date; cards with no state yet are the
// caller's problem, since an unseeded card has no meaningful date.
export function bucketDueByDate(dueDates, today, planDays = PLAN_DAYS) {
  const horizon = addDays(today, planDays - 1);
  const buckets = new Map();

  for (const date of dueDates ?? []) {
    if (!date) continue;
    const day = date <= today ? today : date;
    if (day > horizon) continue;
    buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return buckets;
}

/**
 * Plan the next window of reminders: a due-day reminder for each of the next
 * PLAN_DAYS that actually has cards, plus the win-back ladder for the silence
 * beyond it.
 *
 * Pure: same inputs always give the same output, so the whole policy is
 * unit-testable without a device.
 *
 * @param {object} input
 * @param {string[]} input.dueDates      every card's due date, ISO YYYY-MM-DD
 * @param {number[]} input.reviewHours   local hour of each recent session
 * @param {number} input.streak          current streak count
 * @param {string|null} input.lastStudyDate  ISO date of last review, or null
 * @param {string} input.today           ISO date
 * @returns {Array<{date: string, hour: number, minute: number, title: string, body: string}>}
 *   ascending by date, at most one per day, empty when there is nothing true to say.
 */
export function planReminders({ dueDates, reviewHours, streak, lastStudyDate, today }) {
  const buckets = bucketDueByDate(dueDates, today, PLAN_DAYS);
  const hour = preferredHour(reviewHours);
  const minute = LEAD_MINUTES === 30 ? 30 : 0;
  const plan = [];

  for (let offset = 0; offset < PLAN_DAYS; offset += 1) {
    const date = addDays(today, offset);
    const count = buckets.get(date) ?? 0;

    // The whole point: silence on days with nothing due. A reminder that is
    // wrong even occasionally teaches people to dismiss it unread, and no
    // amount of better copy wins that habit back.
    if (count === 0) continue;

    plan.push({ date, hour, minute, ...dueMessage(date, count) });
  }

  // A live streak that today's session hasn't yet renewed is a real deadline,
  // so it replaces today's ordinary reminder and fires later in the evening.
  const studiedToday = lastStudyDate === today;
  const streakAlive = lastStudyDate === today || lastStudyDate === addDays(today, -1);
  if (streak > 1 && streakAlive && !studiedToday) {
    const withoutToday = plan.filter((entry) => entry.date !== today);
    withoutToday.unshift({
      date: today,
      hour: Math.max(hour, STREAK_RESCUE_HOUR),
      minute: 0,
      ...streakMessage(streak),
    });
    plan.length = 0;
    plan.push(...withoutToday);
  }

  // Win-back rungs land beyond the due-day window, covering the silence after
  // someone stops opening the app. Every card they have is overdue by then, so
  // the count is simply the deck they have started.
  const lapse = planLapseReminders({
    lastStudyDate,
    today,
    hour,
    minute,
    overdueCount: (dueDates ?? []).filter(Boolean).length,
    streak,
  });

  // A rung is only honest once the user has actually gone quiet, so drop any
  // that a due-day reminder still precedes. Without this, someone mid-schedule
  // gets "pick up where you left off" on a Tuesday with cards due Thursday —
  // a win-back message aimed at a user who never left.
  const lastDueDate = plan.length > 0 ? plan[plan.length - 1].date : null;
  const taken = new Set(plan.map((entry) => entry.date));

  for (const entry of lapse) {
    if (taken.has(entry.date)) continue;
    if (lastDueDate && entry.date <= lastDueDate) continue;
    taken.add(entry.date);
    plan.push(entry);
  }

  return plan.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
