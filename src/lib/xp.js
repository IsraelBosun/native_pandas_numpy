// Derived score, not persisted state — computed straight from grades already
// written to review_log, same way stats.js derives retention/mastery. Keeps
// gamification a read-only layer on top of the scheduler, never an input to
// it (grading itself must stay honest about recall, not XP-chasing).
const XP_BY_GRADE = { 2: 0, 3: 5, 4: 10, 5: 15 };

export function xpForGrade(grade) {
  return XP_BY_GRADE[grade] ?? 0;
}
