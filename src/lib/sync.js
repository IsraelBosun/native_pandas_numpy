import { getSession } from './auth';
import { clearLocalProgress, getDeviceId, getSyncedUserId, setSyncedUserId } from './cards';
import { getDb } from './db';
import { isSyncableMetaKey, mergeAppMeta, mergeCardStates, remoteLogsToImport } from './merge';
import { supabase } from './supabase';

// Offline-first sync: local SQLite stays the source of truth; Supabase is a
// backup target (CLAUDE.md §9). Accounts are optional — with nobody signed in
// this whole module is inert and the app is exactly as local as it ever was.
//
// Push = card_state upserts + append-only review_log inserts + app_meta
// upserts. Pull happens when an account is first adopted on this device and
// whenever the user asks for it explicitly; routine background syncs only
// push, since that's the case that matters (don't lose today's work).
//
// Every entry point swallows failures — no network must never break studying.

// PostgREST caps a select at 1000 rows; page through anything unbounded.
const PAGE_SIZE = 1000;

let inFlight = null;

// Serialized fire-and-forget sync. Resolves true if a sync ran to completion,
// false if sync is unconfigured, signed out, offline, or failed — callers
// never throw. Pass `{ pull: true }` to also merge down anything studied on
// the account's other devices.
export function syncNow({ pull = false } = {}) {
  if (!supabase) return Promise.resolve(false);
  if (!inFlight) {
    inFlight = doSync({ pull })
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

async function doSync({ pull }) {
  const session = await getSession();
  if (!session) return false;

  const userId = session.user.id;
  const knownUserId = await getSyncedUserId();

  if (knownUserId !== userId) {
    // Somebody else's progress is sitting in this database — it's already
    // backed up under their own account, and keeping it would silently
    // credit their reviews to whoever just signed in.
    if (knownUserId !== null) await clearLocalProgress();
    await pullAndMerge();
    await push();
    await setSyncedUserId(userId);
    return true;
  }

  if (pull) await pullAndMerge();
  await push();
  return true;
}

// Called right after a successful sign-in/sign-up so the merge happens while
// the user is still looking at a spinner, rather than silently later.
export async function adoptAccount() {
  return syncNow({ pull: true });
}

async function fetchAll(table, columns, orderColumns) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(columns);
    for (const column of orderColumns) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

// Merges the account's cloud progress into this device. Non-destructive by
// construction — see lib/merge.js for the per-field policy.
async function pullAndMerge() {
  const db = await getDb();
  const deviceId = await getDeviceId();

  const remoteStates = await fetchAll('card_state', '*', ['card_id']);
  const remoteLogs = await fetchAll(
    'review_log',
    'device_id, client_id, card_id, grade, reviewed_at, interval',
    ['device_id', 'client_id']
  );
  const remoteMeta = await fetchAll('app_meta', 'key, value', ['key']);
  if (remoteStates.length === 0 && remoteLogs.length === 0 && remoteMeta.length === 0) return;

  const localStates = await db.getAllAsync(`SELECT * FROM card_state`);
  const localMeta = await db.getAllAsync(`SELECT key, value FROM app_meta`);

  const mergedStates = mergeCardStates(localStates, remoteStates);
  const mergedMeta = mergeAppMeta(localMeta, remoteMeta);
  const importedLogs = remoteLogsToImport(remoteLogs, deviceId);

  await db.withTransactionAsync(async () => {
    for (const row of mergedStates) {
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
    for (const log of importedLogs) {
      // synced = 1: these came from the cloud, pushing them back would be a
      // round trip to nowhere. The unique index on (device_id, origin_id)
      // makes a repeated pull a no-op.
      await db.runAsync(
        `INSERT OR IGNORE INTO review_log
           (card_id, grade, reviewed_at, interval, device_id, origin_id, synced)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        log.card_id,
        log.grade,
        log.reviewed_at,
        log.interval,
        log.device_id,
        log.client_id
      );
    }
    for (const meta of mergedMeta) {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
        meta.key,
        meta.value
      );
    }
  });
}

async function push() {
  const db = await getDb();
  const deviceId = await getDeviceId();

  // Append-only log, only this device's own un-pushed rows. Idempotent via the
  // (user_id, device_id, client_id) primary key upstream, so a push that dies
  // halfway through is safe to repeat.
  const pending = await db.getAllAsync(
    `SELECT * FROM review_log WHERE device_id IS NULL AND synced = 0 ORDER BY id`
  );
  if (pending.length > 0) {
    const { error } = await supabase.from('review_log').upsert(
      pending.map((log) => ({
        device_id: deviceId,
        client_id: log.id,
        card_id: log.card_id,
        grade: log.grade,
        reviewed_at: log.reviewed_at,
        interval: log.interval,
      })),
      { onConflict: 'user_id,device_id,client_id', ignoreDuplicates: true }
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
  const syncableMeta = metaRows.filter((row) => isSyncableMetaKey(row.key));
  if (syncableMeta.length > 0) {
    const { error } = await supabase
      .from('app_meta')
      .upsert(syncableMeta, { onConflict: 'user_id,key' });
    if (error) throw error;
  }

  // Only after every upload above succeeded.
  if (pending.length > 0) {
    await db.runAsync(
      `UPDATE review_log SET synced = 1 WHERE device_id IS NULL AND id <= ?`,
      pending[pending.length - 1].id
    );
  }
}

// True when this device has work that hasn't reached the cloud yet — lets the
// UI warn before a log out throws it away.
export async function hasUnsyncedWork() {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS n FROM review_log WHERE device_id IS NULL AND synced = 0`
  );
  return row.n > 0;
}
