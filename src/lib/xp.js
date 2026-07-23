// Derived score, not persisted state — computed straight from grades already
// written to review_log, same way stats.js derives retention/mastery. Keeps
// gamification a read-only layer on top of the scheduler, never an input to
// it (grading itself must stay honest about recall, not XP-chasing).
const XP_BY_GRADE = { 2: 0, 3: 5, 4: 10, 5: 15 };

export function xpForGrade(grade) {
  return XP_BY_GRADE[grade] ?? 0;
}

// Lifetime XP = every graded review ever, summed. Mirrors the same CASE in
// public.leaderboard() (scripts/supabase_schema.sql) so the number the phone
// shows matches the one the server ranks on. Takes rows with a `grade` field.
export function lifetimeXp(logs) {
  let total = 0;
  for (const log of logs) total += xpForGrade(log.grade);
  return total;
}
