import { buildAchievements, evaluateAchievements } from './achievements';
import { getDb } from './db';
import { getAllCards, TOPICS } from './content';
import { DEVICE_LOCAL_META_KEYS } from './merge';
import { schedule, previewIntervals } from './scheduler';
import { todayISO, addDays } from './date';
import { seedIfNeeded } from './seed';
import { bucketReviewsByDate, computeRetentionSeries, computeWeakestTopics } from './stats';
import { bumpStreak, displayStreak } from './streak';
import { lifetimeXp } from './xp';

const ACHIEVEMENT_KEY_PREFIX = 'achievement:';

// Anki's convention for a "mature" (well-learned) card — used as the
// denominator for the topic mastery bars.
const MATURE_INTERVAL_DAYS = 21;

function contentById() {
  const map = new Map();
  for (const card of getAllCards()) map.set(card.id, card);
  return map;
}

function toCardState(row) {
  return {
    ef: row.ef,
    interval: row.interval,
    reps: row.reps,
    dueDate: row.due_date,
    lastGrade: row.last_grade,
    reviewedAt: row.reviewed_at,
    favorite: !!row.favorite,
    note: row.note,
  };
}

export async function getDueCards({ topic, limit = 20, today = todayISO() } = {}) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT * FROM card_state WHERE due_date <= ? ORDER BY due_date ASC`,
    today
  );

  const byId = contentById();
  const due = [];
  for (const row of rows) {
    const content = byId.get(row.card_id);
    if (!content) continue; // stale state row for content that no longer exists
    if (topic && content.topic !== topic) continue;
    due.push({ ...content, ...toCardState(row) });
    if (due.length >= limit) break;
  }
  return due;
}

// First topic (in learning-path/TOPICS order) that has at least one due card.
export async function getNextTopicToStudy() {
  for (const topic of TOPICS) {
    const due = await getDueCards({ topic: topic.id, limit: 1 });
    if (due.length > 0) return topic.id;
  }
  return null;
}

export function previewCardIntervals(cardState, today = todayISO()) {
  return previewIntervals(cardState, today);
}

export async function recordReview(cardId, grade, today = todayISO()) {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT * FROM card_state WHERE card_id = ?`, cardId);
  const next = schedule(toCardState(row), grade, today);
  const nowISO = new Date().toISOString();

  await db.runAsync(
    `UPDATE card_state SET ef = ?, interval = ?, reps = ?, due_date = ?, last_grade = ?, reviewed_at = ? WHERE card_id = ?`,
    next.ef,
    next.interval,
    next.reps,
    next.dueDate,
    grade,
    nowISO,
    cardId
  );
  await db.runAsync(
    `INSERT INTO review_log (card_id, grade, reviewed_at, interval) VALUES (?, ?, ?, ?)`,
    cardId,
    grade,
    nowISO,
    next.interval
  );
  await touchStudyStreak(db, today);

  return next;
}

// A streak day is earned by any recorded review, not by finishing the whole
// due queue — exiting a session early still keeps the day. Idempotent per
// calendar day.
async function touchStudyStreak(db, today) {
  const lastRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'last_study_date'`);
  const countRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'streak_count'`);
  const next = bumpStreak(countRow ? Number(countRow.value) : 0, lastRow?.value ?? null, today);
  if (next == null) return;

  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('streak_count', ?)`,
    String(next)
  );
  await db.runAsync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('last_study_date', ?)`, today);
}

export async function setFavorite(cardId, favorite) {
  const db = await getDb();
  await db.runAsync(`UPDATE card_state SET favorite = ? WHERE card_id = ?`, favorite ? 1 : 0, cardId);
}

export async function setNote(cardId, note) {
  const db = await getDb();
  await db.runAsync(`UPDATE card_state SET note = ? WHERE card_id = ?`, note || null, cardId);
}

// Starred cards across every topic — backs Practice's "Starred" session,
// which (like cram mode) never calls schedule()/recordReview().
export async function getFavoriteCards() {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT * FROM card_state WHERE favorite = 1`);
  const byId = contentById();
  const favorites = [];
  for (const row of rows) {
    const content = byId.get(row.card_id);
    if (!content) continue;
    favorites.push({ ...content, ...toCardState(row) });
  }
  return favorites;
}

export async function getAllTopicsMastery() {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT card_id, interval FROM card_state`);
  const byId = contentById();

  const intervalsByTopic = new Map(TOPICS.map((topic) => [topic.id, []]));
  for (const row of rows) {
    const content = byId.get(row.card_id);
    if (!content) continue;
    intervalsByTopic.get(content.topic)?.push(row.interval);
  }

  return TOPICS.map((topic) => {
    const intervals = intervalsByTopic.get(topic.id) ?? [];
    const mastery = intervals.length
      ? Math.round(
          (intervals.reduce((sum, interval) => sum + Math.min(interval / MATURE_INTERVAL_DAYS, 1), 0) /
            intervals.length) *
            100
        )
      : 0;
    return { ...topic, mastery };
  });
}

export async function getReviewHeatmap({ weeks = 12 } = {}) {
  const db = await getDb();
  const cutoff = addDays(todayISO(), -(weeks * 7 - 1));
  const rows = await db.getAllAsync(`SELECT * FROM review_log WHERE reviewed_at >= ?`, cutoff);
  return bucketReviewsByDate(rows, { weeks });
}

export async function getRetentionSeries({ days = 14 } = {}) {
  const db = await getDb();
  const cutoff = addDays(todayISO(), -(days - 1));
  const rows = await db.getAllAsync(`SELECT * FROM review_log WHERE reviewed_at >= ?`, cutoff);
  return computeRetentionSeries(rows, { days });
}

export async function getWeakestTopics({ limit = 3 } = {}) {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT card_id, ef FROM card_state`);
  return computeWeakestTopics(rows, contentById(), TOPICS, { limit });
}

export async function hasSeenOnboarding() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'onboarding_seen'`);
  return !!row;
}

export async function markOnboardingSeen() {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('onboarding_seen', '1')`);
}

export async function resetOnboarding() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM app_meta WHERE key = 'onboarding_seen'`);
}

export async function hasSeenLesson(topicId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT value FROM app_meta WHERE key = ?`,
    `lesson_seen:${topicId}`
  );
  return !!row;
}

export async function markLessonSeen(topicId) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, '1')`,
    `lesson_seen:${topicId}`
  );
}

export async function getLessonStep(topicId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT value FROM app_meta WHERE key = ?`,
    `lesson_step:${topicId}`
  );
  return row ? Number(row.value) : 0;
}

export async function saveLessonStep(topicId, stepIndex) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
    `lesson_step:${topicId}`,
    String(stepIndex)
  );
}

export async function clearLessonStep(topicId) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM app_meta WHERE key = ?`, `lesson_step:${topicId}`);
}

export async function getCompletedChallenges() {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT key FROM app_meta WHERE key LIKE 'challenge_done:%'`);
  return rows.map((row) => row.key.slice('challenge_done:'.length));
}

// Legacy completions stored the bare flag '1' with no metrics; parse those as
// "completed, score unknown" (null counts) so old data still reads as done.
function parseChallengeResult(value) {
  if (value == null) return null;
  if (value === '1') return { correctCount: null, total: null, completedAt: null };
  try {
    const parsed = JSON.parse(value);
    return {
      correctCount: parsed.correctCount ?? null,
      total: parsed.total ?? null,
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    return { correctCount: null, total: null, completedAt: null };
  }
}

export async function getChallengeResult(challengeId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT value FROM app_meta WHERE key = ?`,
    `challenge_done:${challengeId}`
  );
  return row ? parseChallengeResult(row.value) : null;
}

export async function getChallengeResults() {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT key, value FROM app_meta WHERE key LIKE 'challenge_done:%'`);
  const results = {};
  for (const row of rows) {
    results[row.key.slice('challenge_done:'.length)] = parseChallengeResult(row.value);
  }
  return results;
}

export async function markChallengeComplete(challengeId, stats = {}) {
  const db = await getDb();
  const value = JSON.stringify({
    correctCount: stats.correctCount ?? null,
    total: stats.total ?? null,
    completedAt: stats.completedAt ?? todayISO(),
  });
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
    `challenge_done:${challengeId}`,
    value
  );
}

// Lifetime XP for display (Settings/Leaderboard header). Derived from every
// grade in review_log, matching the server-side formula in public.leaderboard()
// so what the phone shows lines up with where the account ranks.
export async function getLifetimeXp() {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT grade FROM review_log`);
  return lifetimeXp(rows);
}

export async function getStreak(today = todayISO()) {
  const db = await getDb();
  const countRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'streak_count'`);
  const lastRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'last_study_date'`);
  return displayStreak(countRow ? Number(countRow.value) : 0, lastRow?.value ?? null, today);
}

// Raw streak state for the reminder planner: the stored count plus the last
// study date. getStreak() deliberately reports 0 once a streak has lapsed,
// which hides exactly the "alive but not yet renewed today" case the streak
// reminder exists to catch.
export async function getStreakState() {
  const db = await getDb();
  const countRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'streak_count'`);
  const lastRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'last_study_date'`);
  return {
    count: countRow ? Number(countRow.value) : 0,
    lastStudyDate: lastRow?.value ?? null,
  };
}

// Full catalog with unlock state — for the Stats screen's achievements grid.
export async function getAchievements() {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT key, value FROM app_meta WHERE key LIKE 'achievement:%'`);
  const unlockedAt = new Map(rows.map((row) => [row.key.slice(ACHIEVEMENT_KEY_PREFIX.length), row.value]));
  return buildAchievements(TOPICS).map((achievement) => ({
    ...achievement,
    unlockedAt: unlockedAt.get(achievement.id) ?? null,
  }));
}

// Evaluates every achievement against current progress and persists any that
// newly qualify. Returns only the ones unlocked *by this call* (empty most of
// the time) so the caller can show a one-off celebration. Idempotent — never
// re-unlocks or revokes an id.
export async function checkAchievements({ perfectSession = false } = {}) {
  const db = await getDb();
  const alreadyRows = await db.getAllAsync(`SELECT key FROM app_meta WHERE key LIKE 'achievement:%'`);
  const already = new Set(alreadyRows.map((row) => row.key.slice(ACHIEVEMENT_KEY_PREFIX.length)));

  const totalRow = await db.getFirstAsync(`SELECT COUNT(*) AS n FROM review_log`);
  const streak = await getStreak();
  const topicMastery = new Map((await getAllTopicsMastery()).map((topic) => [topic.id, topic.mastery]));

  const qualifying = evaluateAchievements(TOPICS, {
    totalReviews: totalRow.n,
    streak,
    topicMastery,
    perfectSession,
  });

  const newlyUnlockedIds = [...qualifying].filter((id) => !already.has(id));
  if (newlyUnlockedIds.length === 0) return [];

  const nowISO = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const id of newlyUnlockedIds) {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
        `${ACHIEVEMENT_KEY_PREFIX}${id}`,
        nowISO
      );
    }
  });

  const catalog = buildAchievements(TOPICS);
  return newlyUnlockedIds.map((id) => catalog.find((achievement) => achievement.id === id));
}

// 'system' | 'light' | 'dark' — 'system' defers to the OS setting.
export async function getThemePreference() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'theme_preference'`);
  return row?.value ?? 'system';
}

export async function setThemePreference(preference) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('theme_preference', ?)`,
    preference
  );
}

export async function getNotificationsEnabled() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'notifications_enabled'`);
  return row?.value === '1';
}

export async function setNotificationsEnabled(enabled) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('notifications_enabled', ?)`,
    enabled ? '1' : '0'
  );
}

// A plan books several notifications at once, so the stored value is a JSON
// array of OS ids. Values written by the old single-id version are read back
// as a one-element list rather than migrated — they are cancelled and replaced
// on the next reschedule anyway.
export async function getScheduledReminderIds() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'reminder_notification_id'`);
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [row.value];
  } catch {
    return [row.value];
  }
}

export async function setScheduledReminderIds(ids) {
  const db = await getDb();
  if (ids?.length) {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('reminder_notification_id', ?)`,
      JSON.stringify(ids)
    );
  } else {
    await db.runAsync(`DELETE FROM app_meta WHERE key = 'reminder_notification_id'`);
  }
}

// How many times the in-app reminder nudge has been shown and turned down.
// Tracked because the OS permission dialog can only ever be shown once on
// iOS — the soft ask is what we are allowed to repeat, and only a "yes" to it
// ever spends the real prompt.
export async function getReminderPromptCount() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'reminder_prompt_count'`);
  return row ? Number(row.value) || 0 : 0;
}

// Stamps the lifetime review count at the moment of the ask as well as the
// tally, so a re-ask can require real activity in between rather than
// reappearing the next time Home mounts.
export async function bumpReminderPromptCount() {
  const db = await getDb();
  const next = (await getReminderPromptCount()) + 1;
  const reviews = await getTotalReviewCount();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('reminder_prompt_count', ?)`,
    String(next)
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('reminder_prompt_reviews', ?)`,
    String(reviews)
  );
  return next;
}

// Reviews recorded at the time of the last ask, or 0 if never asked.
export async function getReminderPromptReviews() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'reminder_prompt_reviews'`);
  return row ? Number(row.value) || 0 : 0;
}

// Set once the user either enables reminders or declines the last soft ask —
// either way we stop asking for good.
export async function isReminderPromptSettled() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'reminder_prompt_settled'`);
  return row?.value === '1';
}

export async function settleReminderPrompt() {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('reminder_prompt_settled', '1')`
  );
}

// Every stored due date, for the reminder planner. Cheap even at full deck
// size — one column, no content join, and the planner buckets it in memory.
export async function getAllDueDates() {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT due_date FROM card_state`);
  return rows.map((row) => row.due_date).filter(Boolean);
}

// Local hour of each recent session, most recent first, for send-time
// learning. Grouped by calendar day so a long session counts once and cannot
// outvote the days around it.
export async function getRecentReviewHours({ limit = 20 } = {}) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT reviewed_at FROM review_log ORDER BY reviewed_at DESC LIMIT ?`,
    limit * 40
  );

  const byDay = new Map();
  for (const row of rows) {
    // reviewed_at is a UTC ISO timestamp; the hour has to be read back in
    // local time or the learned slot lands hours off in most timezones.
    const local = new Date(row.reviewed_at);
    if (Number.isNaN(local.getTime())) continue;
    const day = `${local.getFullYear()}-${local.getMonth()}-${local.getDate()}`;
    if (!byDay.has(day)) byDay.set(day, local.getHours());
    if (byDay.size >= limit) break;
  }
  return [...byDay.values()];
}

export async function getTotalReviewCount() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT COUNT(*) AS n FROM review_log`);
  return row.n;
}

// The Home "back up your progress" prompt is a nudge, not a nag — once
// dismissed it stays dismissed.
export async function isSavePromptDismissed() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'save_prompt_dismissed'`);
  return !!row;
}

export async function dismissSavePrompt() {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('save_prompt_dismissed', '1')`
  );
}

// --- Account & device bookkeeping ------------------------------------------

// Stable id for this install, minted on first use. It only has to be unique
// among one account's own devices, so a timestamp plus two random chunks is
// ample — this is provenance, not a secret.
export async function getDeviceId() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'device_id'`);
  if (row?.value) return row.value;

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  await db.runAsync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('device_id', ?)`, id);
  return id;
}

// The Supabase user whose progress this local database currently holds, or
// null while the app has never been signed in. Sync compares it against the
// live session to tell "same person coming back" from "someone else logging
// in on this phone".
export async function getSyncedUserId() {
  const db = await getDb();
  const row = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'sync_user_id'`);
  return row?.value ?? null;
}

export async function setSyncedUserId(userId) {
  const db = await getDb();
  if (userId) {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('sync_user_id', ?)`,
      userId
    );
  } else {
    await db.runAsync(`DELETE FROM app_meta WHERE key = 'sync_user_id'`);
  }
}

// Returns this device to a never-studied state and reseeds a fresh due queue.
// Device-local keys (schema version, device id, theme, reminder settings)
// survive — they describe the phone, not the person. Used when a different
// account signs in here, and on log out.
export async function clearLocalProgress() {
  const db = await getDb();
  // onboarding_seen is synced progress, but re-running the intro on a phone
  // that has already been through it would just be irritating.
  //
  // device_id deliberately goes: a wiped device is a new device as far as the
  // cloud is concerned, so the next pull re-imports every review log rather
  // than skipping the ones this install had already pushed.
  const dropped = new Set(['sync_user_id', 'device_id']);
  const keptKeys = [...DEVICE_LOCAL_META_KEYS, 'onboarding_seen'].filter(
    (key) => !dropped.has(key)
  );
  const placeholders = keptKeys.map(() => '?').join(', ');

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM card_state`);
    await db.runAsync(`DELETE FROM review_log`);
    await db.runAsync(`DELETE FROM app_meta WHERE key NOT IN (${placeholders})`, ...keptKeys);
  });

  await seedIfNeeded();
}
