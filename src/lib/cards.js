import { getDb } from './db';
import { getAllCards, TOPICS } from './content';
import { schedule, previewIntervals } from './scheduler';
import { todayISO, addDays } from './date';
import { bucketReviewsByDate, computeRetentionSeries, computeWeakestTopics } from './stats';
import { bumpStreak, displayStreak } from './streak';

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

export async function markChallengeComplete(challengeId) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, '1')`,
    `challenge_done:${challengeId}`
  );
}

export async function getStreak(today = todayISO()) {
  const db = await getDb();
  const countRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'streak_count'`);
  const lastRow = await db.getFirstAsync(`SELECT value FROM app_meta WHERE key = 'last_study_date'`);
  return displayStreak(countRow ? Number(countRow.value) : 0, lastRow?.value ?? null, today);
}
