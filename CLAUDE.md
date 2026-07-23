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
  grade INTEGER NOT NULL, reviewed_at TEXT NOT NULL, interval INTEGER NOT NULL,
  device_id TEXT, origin_id INTEGER,   -- NULL/NULL = written here; set = pulled
  synced INTEGER NOT NULL DEFAULT 0    -- 1 once it has reached the cloud
);
CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT);
-- app_meta: schema_version, streak_count, last_study_date, seeded_version, achievements
-- Device-local app_meta keys (never synced) are listed in lib/merge.js.
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

## 9. Accounts & Supabase sync (built)

**Accounts are optional and must stay that way.** Signed out, the app is 100%
local and never touches the network — no anonymous auth, no silent account
creation. Signing up is *encouraged* (Home nudge after 10 reviews, Settings →
Account) and only ever adds backup/restore. Never gate content, streaks, or
review behind an account.

- **Local SQLite is always the source of truth**; Supabase is a sync target.
- **All persistence still hides behind `lib/cards.js`/`db.js`** — screens never
  touch SQL or Supabase.
- `lib/auth.js` wraps `supabase.auth` (email + password) and returns
  `{ error: 'sentence for the user' }` rather than throwing.
- `hooks/use-auth.js` owns the session *and* the local-data consequences of
  changing it: sign-in merges, sign-out pushes then wipes the device.
- `lib/sync.js` pushes `card_state` (last-write-wins), `review_log` (append-only,
  keyed `user_id + device_id + client_id`) and syncable `app_meta`. It pulls on
  first adoption of an account and on an explicit "Sync now".
- `lib/merge.js` is the **pure, tested** conflict policy — no DB, no network,
  same discipline as `scheduler.js`. Change merge rules there, not in sync.js.
- Content stays bundled JSON; only *progress* syncs.
- Cloud schema lives in `scripts/supabase_schema.sql`; each change gets a
  numbered `scripts/supabase_migration_NNN_*.sql`. RLS on `auth.uid()` is the
  entire security model — the anon key ships in the binary by design.
- **Never put a secret behind `EXPO_PUBLIC_`.** It is compiled into the bundle.

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
11. Supabase sync + optional accounts (§9). ✅ done

**MVP line:** one verified GroupBy deck + a lesson + flashcard Review + Home
with streak is a real, shippable loop. Ship that before expanding.

---

## 11. Where we left off (2026-07-23)

Multi-user accounts are **written and tested but not yet cut over.** The code is
merged; the Supabase project is still on the old single-account schema. Delete
this section once the checklist below is done.

**Code state.** 89 tests pass (`npx vitest run`). Not yet run on a device — the
auth round-trip and merge-on-login need a live Supabase project, which is
blocked on the migration below.

- `ensureSignedIn()` and the bundled `EXPO_PUBLIC_SUPABASE_EMAIL`/`_PASSWORD`
  are **gone**. Signed out, `syncNow()` is inert.
- Entry points into `/auth/sign-in` are exactly two: the Home nudge
  (`components/home/save-progress-card.jsx`, after 10 reviews, dismissible) and
  Settings → Account. Nothing on first launch, by design.
- We capture **email + password only.** The password never touches our SQLite or
  our tables — Supabase hashes it in `auth.users`. Locally we keep only the
  user's UUID, as `app_meta.sync_user_id`.
- Local schema is at **v2** (`lib/db.js`): `review_log` gained `device_id`,
  `origin_id`, `synced`. Migration runs on next launch.

**Known gap, not a bug:** a returning user on a fresh install has to find
Settings to log in — the Home nudge needs 10 reviews, which they don't have.
Fix is a "Already have an account? Log in" line on the last onboarding step.

### The cutover checklist (user-side, in order)

1. **Pick a migration by opening the app and checking Stats.**
   - Review count is there → the phone holds the history → run
     `scripts/supabase_migration_002_multiuser.sql`. It backs the rows up to
     `review_log_backup_002`, deletes them, and the phone re-pushes everything
     on first login.
   - Stats empty / fresh install → the cloud is the last copy → run
     `scripts/supabase_migration_002b_multiuser_preserve.sql` instead. It tags
     the old rows `device_id = 'legacy'` and keeps them.
   - **Run one or the other, never both.** 002b is wrong when the phone still
     has the data: the device imports any row whose `device_id` isn't its own,
     so it would import a duplicate of every review it already has.
2. **Rotate the password** on the old shared sync account (Supabase → Auth →
   Users). It shipped in the bundle. Afterwards it's just a normal account — log
   into it from the app.
3. **Decide email confirmation** (Supabase → Auth → Providers → Email). The app
   handles either.
4. **Required for password reset (now built end to end):** allow-list the
   recovery redirect in Supabase → Auth → URL Configuration → Redirect URLs.
   Add `nativepandas://auth/reset-password` (and `nativepandas://*` to be safe).
   Flow: Settings/Sign-in → "Forgot your password?" emails a link →
   `nativepandas://auth/reset-password#access_token…` opens the app →
   `src/app/auth/reset-password.jsx` installs the recovery session
   (`lib/auth.beginRecovery`) and calls `updateUser({ password })`, then merges
   via `adoptAccount()`. Parser is `lib/recovery-link.js` (pure + tested). Needs
   a dev/standalone build — custom schemes don't resolve in Expo Go.
5. **Verify, then clean up:** log in, confirm Stats shows the review count, then
   `drop table public.review_log_backup_002;`.

Both migrations only touch `review_log`. Streak, due dates, ease, stars, notes,
lesson progress and achievements live in `card_state`/`app_meta` and are never
at risk from either one.

Unrelated in-flight work is also uncommitted in the tree: `src/app/practice/race/`,
`src/components/race/`, `src/hooks/use-race-*.js`, `src/lib/race/`,
`assets/sounds/*.wav`. Not part of the accounts change.