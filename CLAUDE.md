# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repo.

---

## 1. What this is

A **mobile learning platform for mastering programming APIs through spaced
repetition.** v1 ships with **pandas and NumPy**. The learning engine stays
generic so new courses (SQL, Polars, Git, Docker, scikit-learn, statistics…)
can be added later **without changing the engine** — a course is just content.

Mental model: *Mimo/Programiz meets Anki.* A short lesson introduces a concept,
then active recall (SM-2 flashcards) drills it into long-term memory.

**Non-negotiables:**
- **Learning first, memorization second.** Each new concept gets a 30–90s
  concise, visual lesson *before* recall is expected. After that, active recall
  is the primary mechanism. Never build passive "read a wall of text" flows.
- **Offline-first.** Must fully work with no signal. All logic local in v1.
- **One decision per screen.** Phone app for spare moments.
- **Content is data, not code.** Lessons + cards ship as JSON; user progress
  lives in SQLite. They never mix (§5).
- **Engine is course-agnostic.** No pandas-specific logic in `lib/`. Anything
  pandas-specific lives in `/content`.

## 2. Product principles

Every feature must serve at least one, or it doesn't belong in v1:
1. Increase long-term retention.
2. Reduce cognitive load.
3. Encourage daily practice.
4. Teach real-world data-analysis workflows.
5. Be enjoyable enough that users return daily.

---

## 3. Tech stack

- **Expo (managed)** — not bare RN. EAS for builds.
- **JavaScript** — plain `.js`/`.jsx`, no TypeScript.
- **expo-router** (file-based nav), **expo-sqlite** (user state),
  **bundled JSON** (content), **reanimated** (animation),
  **react-native-syntax-highlighter** (code), **@expo/vector-icons** (outline).
- State: React Context + hooks. No Redux.

**Do not add** in v1: Redux, a backend, an ORM, TypeScript, auth. If a task
seems to need one, stop and flag it. Supabase sync is designed-for but built
later (§9).

---

## 4. Structure

```
/app                 expo-router screens
  index.js           Home / dashboard
  lesson/[id].js     Micro-lesson (shown before first recall of a concept)
  review.js          Review session — the core loop
  practice/          Topic browser + [topic].js drill + workflow challenges
  stats.js           Retention, heatmap, weak topics, achievements
  reference.js       Searchable MDN-style method reference
/lib
  scheduler.js       SM-2 — PURE functions, no DB, no React
  db.js              SQLite open + schema + guarded migrations
  cards.js           Join content JSON with SQLite state; all data access here
  search.js          Global search index
  seed.js            First-launch seeding
/content
  /pandas  *.json    One deck per topic (versioned)
  /numpy   *.json
  /challenges *.json Workflow challenges: multi-step pipelines with precomputed
                     table states; verified vs real pandas by
                     scripts/verify_challenges.py (run it after any edit)
/constants/theme.js  Colors, spacing, typography tokens
/hooks               useDueCards, useSession, etc.
```

**Rules:** `scheduler.js` is pure (state + grade + `today` in → new state out).
Screens never touch SQLite — they go through `lib/cards.js`. Never hardcode
colors/spacing/fonts; import from `theme.js`. Nothing in `/lib` knows about
pandas.

---

## 5. The SM-2 scheduler (`lib/scheduler.js`)

Highest-leverage code in the app. Get it exactly right; test it first.

State per card: `ef` (ease, float, start **2.5**, floor **1.3**), `interval`
(days, start **0**), `reps` (consecutive correct, start **0**), plus `dueDate`.

Buttons → grades: **Again**=2, **Hard**=3, **Good**=4, **Easy**=5.

```js
// Anki-style multipliers on top of the SM-2 base interval — see note below.
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
    reps = 0; interval = 1;
  }
  ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (ef < 1.3) ef = 1.3;
  return { ...card, ef, interval, reps, dueDate: addDays(today, interval) };
}
```

**Deviation from textbook SM-2, deliberate:** in plain SM-2, grade only affects
`ef` (which compounds into *future* intervals) — for a given `reps` bucket,
Hard/Good/Easy compute the *identical* next interval, differing only in the
invisible ease factor. That makes three grade buttons show the same day-count,
which reads as broken in the Review UI. `HARD_INTERVAL_FACTOR`/`EASY_BONUS` are
applied on top of the SM-2 base interval (Anki does the same thing) so the
three buttons always diverge immediately.

Work in ISO date strings (`YYYY-MM-DD`), not `Date` objects (timezone drift).
**Again** cards also requeue near the end of the *current* session (that logic
lives in the session hook, not the scheduler). Test: fresh card graded Good ×3 →
intervals 1 → 6 → ~15 (`round(6 * 2.5)`, unaffected by the Good-branch since
`HARD_INTERVAL_FACTOR`/`EASY_BONUS` only apply to grades 3/5); graded Again →
reps 0, interval 1.

---

## 6. Data model

Two layers that never mix.

**Content (read-only JSON).** One versioned deck per topic:
```json
{ "version": "1.0.0", "cards": [ { ...card } ] }
```
A card:
```json
{
  "id": "groupby_sum_sorted",   // stable — NEVER renumber/reuse (joins to progress)
  "topic": "groupby", "subtopic": "aggregation",
  "tags": ["aggregation","sorting"], "difficulty": "medium",
  "prerequisites": ["groupby_basic"],
  "dataset": "df",              // optional; name(s) of the sample table(s) the
                                 // card operates on, keyed into `lib/fixtures.js`
                                 // (mirrors scripts/fixtures.py). Array for
                                 // cards spanning two tables (e.g. a merge).
                                 // Omitted when the card has no backing table
                                 // (e.g. syntax-only cards).
  "type": "flashcard",          // flashcard | fill-blank | multiple-choice
  "prompt": "Total revenue per region, sorted high to low.",
  "answer": "df.groupby('region')['revenue'].sum().sort_values(ascending=False)",
  "why": "Select the column before aggregating to avoid a wide result.",
  "whenToUse": "Summarising a metric across categories.",
  "commonMistake": "Forgetting ascending=False.",
  "relatedMethods": ["agg","sort_values","reset_index"],
  "example": "# West 120\n# East 95",
  "starterCode": "", "expectedOutput": "",
  "tokens": [], "distractors": []
}
```
`distractors` required for multiple-choice; `tokens` for fill-blank; else empty.
`difficulty` is only the **author's initial estimate** — see §8.

**Progress (SQLite).** The only thing that changes as users study:
```sql
CREATE TABLE card_state (
  card_id TEXT PRIMARY KEY,        -- joins to content `id`
  ef REAL DEFAULT 2.5, interval INTEGER DEFAULT 0, reps INTEGER DEFAULT 0,
  due_date TEXT NOT NULL, last_grade INTEGER, reviewed_at TEXT,
  favorite INTEGER DEFAULT 0, note TEXT   -- star + personal note per card
);
CREATE TABLE review_log (          -- append-only; powers stats + dynamic difficulty
  id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT NOT NULL,
  grade INTEGER NOT NULL, reviewed_at TEXT NOT NULL, interval INTEGER NOT NULL
);
CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT);
-- app_meta: schema_version, streak_count, last_study_date, seeded_version, achievements
```

**Join:** `lib/cards.js` merges content + `card_state` by id. "Due today" =
cards whose `due_date <= todayLocalISO`. **Seed:** on first launch, insert a
default `card_state` for any content card lacking one; never overwrite existing
state (new packs add cards without wiping progress).

---

## 7. Screens & behavior

- **Learning path (progressive, not locked).** Default order:
  Introduction → DataFrame → Series → Read CSV → Selecting → Filtering →
  Sorting → Missing values → GroupBy → Merge → Pivot → DateTime →
  Window functions → Performance. This is the *suggested* sequence and what a
  new user is guided through; topics are **not hard-locked** (users can jump to
  weak spots). `prerequisites` drive *suggestion*, not gating.
- **Lesson (`lesson/[id].js`)** — 30–90s visual intro to a concept before its
  cards. Concise, example-driven.
- **Home** — "what do I do right now": greeting, streak, big **cards-due**
  count, **Start review** button, per-topic mastery bars.
- **Review** — core loop. Due queue (cap ~20). Show prompt → **Show answer**
  reveals answer + why + example → self-grade → `schedule()` → persist +
  `review_log` → next. **Again** requeues in-session. Same scheduler under all
  three card types (fill-blank auto-checks then user grades; MC correct→4,
  wrong→2, adjustable). End → summary (reviewed, missed, retention %, streak).
- **Practice** — topic browser with mastery %; drill any topic off-schedule;
  **cram mode** reshuffles WITHOUT writing SM-2 dates (never calls `schedule()`).
  Also hosts **workflow challenges**: multi-step real pandas pipelines (e.g.
  read CSV → drop duplicates → parse dates → groupby → aggregate → sort →
  export) that test whole workflows, not single methods.
- **Stats** — calendar heatmap, retention line, weakest topics (lowest avg
  `ef`), achievements.
- **Reference** — MDN-style per method: purpose, syntax, parameters, returns,
  example, common mistakes, related methods, tips. Shows `relatedMethods` as
  clickable links. No scheduling here.
- **Search (global).** Available everywhere. Indexes method names, topics, tags,
  aliases, descriptions. Instant lookup of `groupby`, `iloc`, `dropna`, etc.

**Post-MVP (design-compatible, build after core loop):** favorites (star →
review starred separately), personal notes per card, achievements (First
Review, 100/500 Reviews, 7-Day Streak, Merge Master, NumPy Wizard, Perfect
Session…). Columns already exist in the schema; don't build the UI before the
core loop works.

---

## 8. Conventions

- **JavaScript, functional components + hooks only.**
- **Scheduler stays pure and tested.** Any change there is high-risk.
- **Content correctness is sacred.** Every `answer` must be real, runnable
  pandas/NumPy — a wrong signature memorized is worse than no app. Add a script
  that runs each card's `example` against real pandas and flags failures.
- **Never reuse/renumber card `id`s** (join key to progress).
- **All data access in `lib/`;** screens never touch SQL.
- **Dynamic difficulty.** Author `difficulty` is an initial estimate only; over
  time compute real difficulty from `review_log` (success rate, avg recall,
  retention). Use it to inform ordering/weak-topic surfacing.
- **Guarded migrations.** Bump `schema_version`; explicit migration steps; never
  silently drop user tables.
- **Design:** dark theme default (both modes work, no hardcoded colors); code
  always monospace + highlighted; color = meaning (blue=action, green=mastered,
  orange=weak, red=failed); primary buttons in bottom thumb-zone; ≥44px targets;
  round all displayed numbers; sentence case.

---

## 9. Future: Supabase sync (design now, build later)

v1 is 100% local. Keep it drop-in ready:
- **All persistence hides behind `lib/cards.js`/`db.js`** (`getDueCards()`,
  `recordReview()`, …). When Supabase lands, only these change — not screens.
- `card_state` + `review_log` map directly to future Supabase tables (string
  ids, ISO datetimes, no device-specific data). Plan for a `user_id` later.
- Sync model: local SQLite is source of truth offline; Supabase is a sync
  target. Append-only `review_log` → easy conflict resolution (last-write-wins
  on `card_state`, union on `review_log`).
- Content stays bundled JSON even after Supabase; only *progress* syncs.

Don't add Supabase/auth/network until the local loop is complete and the
scheduler is tested.

---

## 10. Build order (MVP first)

1. `scheduler.js` + unit tests.
2. `db.js` schema + `seed.js`.
3. One verified deck (`content/pandas/groupby.json`, ~15–20 cards).
4. `cards.js` join + `getDueCards()`/`recordReview()`.
5. Review screen (flashcard type) — core loop end to end.
6. Home dashboard + streak + session summary.
7. Lesson screen + learning-path ordering.
8. Remaining decks + card types (fill-blank, multiple-choice).
9. Practice (incl. workflow challenges), Stats, Reference, global search.
10. Post-MVP: favorites, notes, achievements, dynamic difficulty tuning.
11. Only then: Supabase (§9).

**MVP line:** one verified GroupBy deck + a lesson + flashcard Review + Home
with streak is a real, shippable loop. Ship that before expanding.