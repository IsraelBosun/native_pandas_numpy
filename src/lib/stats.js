import { addDays, todayISO } from './date';

// Pure aggregation over review_log/card_state rows — no DB/React imports, so
// this is unit-testable with plain fixture arrays.

export function bucketReviewsByDate(reviewLogRows, { weeks = 12 } = {}) {
  const days = weeks * 7;
  const today = todayISO();
  const start = addDays(today, -(days - 1));

  const counts = new Map();
  for (const row of reviewLogRows) {
    const date = row.reviewed_at.slice(0, 10);
    if (date < start || date > today) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  const result = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    result.push({ date, count: counts.get(date) ?? 0 });
  }
  return result;
}

export function computeRetentionSeries(reviewLogRows, { days = 14 } = {}) {
  const today = todayISO();
  const start = addDays(today, -(days - 1));

  const byDate = new Map();
  for (const row of reviewLogRows) {
    const date = row.reviewed_at.slice(0, 10);
    if (date < start || date > today) continue;
    const bucket = byDate.get(date) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (row.grade >= 3) bucket.correct += 1;
    byDate.set(date, bucket);
  }

  const result = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const bucket = byDate.get(date);
    result.push({
      date,
      // null (not 0%) on no-review days, so the UI can render a gap instead
      // of a misleading zero.
      retention: bucket ? Math.round((bucket.correct / bucket.total) * 100) : null,
    });
  }
  return result;
}

export function computeWeakestTopics(cardStateRows, contentById, topics, { limit = 3 } = {}) {
  const efByTopic = new Map(topics.map((topic) => [topic.id, []]));
  for (const row of cardStateRows) {
    const content = contentById.get(row.card_id);
    if (!content) continue;
    efByTopic.get(content.topic)?.push(row.ef);
  }

  return topics
    .map((topic) => {
      const efs = efByTopic.get(topic.id) ?? [];
      const avgEf = efs.length ? efs.reduce((sum, ef) => sum + ef, 0) / efs.length : null;
      return { ...topic, avgEf };
    })
    .filter((topic) => topic.avgEf !== null)
    .sort((a, b) => a.avgEf - b.avgEf)
    .slice(0, limit);
}
