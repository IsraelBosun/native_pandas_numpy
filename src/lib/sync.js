import { getDb } from './db';
import { supabase } from './supabase';

// Offline-first sync: local SQLite stays the source of truth; Supabase is a
// backup target (CLAUDE.md §9). Push = card_state upserts + append-only
// review_log inserts + app_meta upserts. Pull happens only on a fresh
// install (empty local review_log) to restore an existing user's progress.
// Every entry point swallows failures — no network must never break studying.

// Local bookkeeping keys that describe this device, not the user's progress.
// reminder_notification_id is an OS-assigned scheduled-notification handle —
// meaningless (and potentially wrong) on any device other than the one that
// created it.
const LOCAL_ONLY_META = new Set(['schema_version', 'sync_last_review_id', 'reminder_notification_id']);

// PostgREST caps a select at 1000 rows; page through anything unbounded.
const PAGE_SIZE = 1000;

let inFlight = null;

// Serialized fire-and-forget sync. Resolves true if a sync ran to completion,
// false if sync is unconfigured, offline, or failed — callers never throw.
export function syncNow() {
  if (!supabase) return Promise.resolve(false);
  if (!inFlight) {
    inFlight = doSync()
      .catch((err) => {
        // Expected whenever the phone is offline — the next syncNow() retries.
        console.warn('[sync] skipped:', err?.message ?? err);
        return false;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

async function doSync() {
  await ensureSignedIn();
  const db = await getDb();
  await pullIfFreshInstall(db);
  await push(db);
  return true;
}

// Signs in with the owner's Supabase account (created manually in the
// dashboard); the session persists in AsyncStorage so this only hits the
// network once per install. Every install syncs to the same account, which
// means a reinstall restores progress automatically.
async function ensureSignedIn() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const email = process.env.EXPO_PUBLIC_SUPABASE_EMAIL;
  const password = process.env.EXPO_PUBLIC_SUPABASE_PASSWORD;
  if (!email || !password) throw new Error('sync account credentials not configured');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function fetchAll(table, columns, orderColumn) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

// Restore: only when this install has never recorded a review AND the
// account has remote progress. Never merges into existing local state.
async function pullIfFreshInstall(db) {
  const localReviews = await db.getFirstAsync(`SELECT COUNT(*) AS n FROM review_log`);
  if (localReviews.n > 0) return;

  const remoteStates = await fetchAll('card_state', '*', 'card_id');
  if (remoteStates.length === 0) return;

  const remoteLogs = await fetchAll(
    'review_log',
    'client_id, card_id, grade, reviewed_at, interval',
    'client_id'
  );
  const remoteMeta = await fetchAll('app_meta', 'key, value', 'key');

  await db.withTransactionAsync(async () => {
    for (const row of remoteStates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO card_state
           (card_id, ef, interval, reps, due_date, last_grade, reviewed_at, favorite, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.card_id,
        row.ef,
        row.interval,
        row.reps,
        row.due_date,
        row.last_grade,
        row.reviewed_at,
        row.favorite,
        row.note
      );
    }
    for (const log of remoteLogs) {
      // Preserve the original local ids so the push cursor stays consistent.
      await db.runAsync(
        `INSERT OR IGNORE INTO review_log (id, card_id, grade, reviewed_at, interval)
         VALUES (?, ?, ?, ?, ?)`,
        log.client_id,
        log.card_id,
        log.grade,
        log.reviewed_at,
        log.interval
      );
    }
    for (const meta of remoteMeta) {
      if (LOCAL_ONLY_META.has(meta.key)) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
        meta.key,
        meta.value
      );
    }
    const maxId = remoteLogs.reduce((max, log) => Math.max(max, log.client_id), 0);
    await setPushCursor(db, maxId);
  });
}

async function push(db) {
  const cursorRow = await db.getFirstAsync(
    `SELECT value FROM app_meta WHERE key = 'sync_last_review_id'`
  );
  const cursor = cursorRow ? Number(cursorRow.value) : 0;

  // Append-only log: only rows newer than the cursor; idempotent via the
  // (user_id, client_id) primary key upstream.
  const newLogs = await db.getAllAsync(
    `SELECT * FROM review_log WHERE id > ? ORDER BY id`,
    cursor
  );
  if (newLogs.length > 0) {
    const { error } = await supabase.from('review_log').upsert(
      newLogs.map((log) => ({
        client_id: log.id,
        card_id: log.card_id,
        grade: log.grade,
        reviewed_at: log.reviewed_at,
        interval: log.interval,
      })),
      { onConflict: 'user_id,client_id', ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  // Last-write-wins upsert of every card that has ever been studied —
  // unstudied cards stay implicit (they're recreated by seeding anyway).
  const states = await db.getAllAsync(`SELECT * FROM card_state WHERE reviewed_at IS NOT NULL`);
  if (states.length > 0) {
    const { error } = await supabase.from('card_state').upsert(
      states.map((s) => ({
        card_id: s.card_id,
        ef: s.ef,
        interval: s.interval,
        reps: s.reps,
        due_date: s.due_date,
        last_grade: s.last_grade,
        reviewed_at: s.reviewed_at,
        favorite: s.favorite,
        note: s.note,
      })),
      { onConflict: 'user_id,card_id' }
    );
    if (error) throw error;
  }

  // Streak, lesson progress, completed challenges, achievements — everything
  // in app_meta except device-local bookkeeping.
  const metaRows = await db.getAllAsync(`SELECT key, value FROM app_meta`);
  const syncableMeta = metaRows.filter((row) => !LOCAL_ONLY_META.has(row.key));
  if (syncableMeta.length > 0) {
    const { error } = await supabase
      .from('app_meta')
      .upsert(syncableMeta, { onConflict: 'user_id,key' });
    if (error) throw error;
  }

  // Advance the cursor only after every upload above succeeded.
  if (newLogs.length > 0) {
    await setPushCursor(db, newLogs[newLogs.length - 1].id);
  }
}

async function setPushCursor(db, id) {
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('sync_last_review_id', ?)`,
    String(id)
  );
}
