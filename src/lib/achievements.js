// Pure achievement catalog + evaluation — no DB/React imports, unit-testable
// with plain fixture arrays (mirrors lib/stats.js). Topic-mastery and
// subject-wizard entries are generated from a `topics` list (id/label/
// subject/icon/hue), so this file knows nothing about pandas or numpy
// specifically — only the shape of a topic (course-agnostic, CLAUDE.md §1).

const REVIEW_MILESTONES = [1, 10, 100, 500];
const STREAK_MILESTONES = [3, 7, 30];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function subjectsOf(topics) {
  return [...new Set(topics.map((topic) => topic.subject))];
}

// The full catalog, in a stable order — callers persist unlocks by `id`, so
// ids must never be renumbered/reused once shipped (same rule as card ids).
export function buildAchievements(topics) {
  return [
    ...REVIEW_MILESTONES.map((n) => ({
      id: `reviews:${n}`,
      title: n === 1 ? 'First Review' : `${n} Reviews`,
      description: n === 1 ? 'Complete your first review.' : `Complete ${n} total reviews.`,
      icon: 'check-circle',
      hue: 'blue',
    })),
    ...STREAK_MILESTONES.map((n) => ({
      id: `streak:${n}`,
      title: `${n}-Day Streak`,
      description: `Study ${n} days in a row.`,
      icon: 'zap',
      hue: 'amber',
    })),
    {
      id: 'perfect-session',
      title: 'Perfect Session',
      description: 'Finish a review session with zero misses.',
      icon: 'star',
      hue: 'green',
    },
    ...topics.map((topic) => ({
      id: `topic-master:${topic.id}`,
      title: `${topic.label} Master`,
      description: `Reach 100% mastery in ${topic.label}.`,
      icon: topic.icon,
      hue: topic.hue,
    })),
    ...subjectsOf(topics).map((subject) => ({
      id: `subject-wizard:${subject}`,
      title: `${capitalize(subject)} Wizard`,
      description: `Master every ${capitalize(subject)} topic.`,
      icon: 'award',
      hue: 'violet',
    })),
  ];
}

// Given a stats snapshot, returns the Set of achievement ids that currently
// qualify. Callers diff this against already-unlocked ids — nothing here
// ever "revokes" an id, so a lapsed streak doesn't take a badge back.
export function evaluateAchievements(topics, { totalReviews, streak, topicMastery, perfectSession }) {
  const qualifying = new Set();

  for (const n of REVIEW_MILESTONES) {
    if (totalReviews >= n) qualifying.add(`reviews:${n}`);
  }
  for (const n of STREAK_MILESTONES) {
    if (streak >= n) qualifying.add(`streak:${n}`);
  }
  if (perfectSession) qualifying.add('perfect-session');

  for (const topic of topics) {
    if ((topicMastery.get(topic.id) ?? 0) >= 100) qualifying.add(`topic-master:${topic.id}`);
  }

  for (const subject of subjectsOf(topics)) {
    const inSubject = topics.filter((topic) => topic.subject === subject);
    const allMastered = inSubject.every((topic) => (topicMastery.get(topic.id) ?? 0) >= 100);
    if (allMastered) qualifying.add(`subject-wizard:${subject}`);
  }

  return qualifying;
}
