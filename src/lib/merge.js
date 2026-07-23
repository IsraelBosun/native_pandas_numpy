// Merge policy for signing in on a device that already has local progress.
// PURE functions — no DB, no network, no React. lib/sync.js reads the rows,
// calls these, and writes the result back.
//
// The rule everywhere is "never lose a fact the user earned": a card studied
// on either side keeps its most recent scheduling, an achievement unlocked on
// either side stays unlocked, and review logs are unioned rather than replaced.

// Keys that describe this install rather than the user's learning progress.
// Never pushed and never taken from the cloud — a scheduled-notification
// handle from another phone is meaningless here, and theme is a per-device
// choice, not something to yank around when a second device syncs.
export const DEVICE_LOCAL_META_KEYS = new Set([
  'schema_version',
  'device_id',
  'sync_user_id',
  'theme_preference',
  'notifications_enabled',
  'reminder_notification_id',
]);

// Only meaningful as a pair, so they're merged together rather than key by key.
const STREAK_KEYS = ['streak_count', 'last_study_date'];

export function isSyncableMetaKey(key) {
  return !DEVICE_LOCAL_META_KEYS.has(key);
}

function lastReviewedAt(row) {
  return row?.reviewed_at ?? '';
}

// Later review wins the scheduling fields — a card never studied always loses
// to one that has been. Ties keep the local row: this is the device in hand.
// Star and note aren't scheduling state and can be set without ever reviewing,
// so they're merged independently of who won.
export function mergeCardState(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const winner = lastReviewedAt(remote) > lastReviewedAt(local) ? remote : local;
  const loser = winner === local ? remote : local;

  return {
    ...winner,
    favorite: local.favorite || remote.favorite ? 1 : 0,
    note: winner.note ?? loser.note ?? null,
  };
}

export function mergeCardStates(localRows, remoteRows) {
  const pairs = new Map();
  for (const row of localRows) pairs.set(row.card_id, { local: row, remote: null });
  for (const row of remoteRows) {
    const pair = pairs.get(row.card_id);
    if (pair) pair.remote = row;
    else pairs.set(row.card_id, { local: null, remote: row });
  }
  return [...pairs.values()].map(({ local, remote }) => mergeCardState(local, remote));
}

export function mergeMetaValue(key, localValue, remoteValue) {
  if (localValue === undefined) return remoteValue;
  if (remoteValue === undefined) return localValue;

  // Unlocked-once facts stamped with when they happened — the earlier stamp is
  // the true one.
  if (key.startsWith('achievement:')) {
    return localValue < remoteValue ? localValue : remoteValue;
  }
  // Resumable lesson cursor: furthest progress wins.
  if (key.startsWith('lesson_step:')) {
    return String(Math.max(Number(localValue) || 0, Number(remoteValue) || 0));
  }
  // Everything else left in app_meta is a "this happened" flag — lesson_seen:*,
  // challenge_done:*, onboarding_seen. Present on both sides means the same
  // thing either way, so keep local and avoid a pointless write.
  return localValue;
}

// A streak count is only interpretable alongside the date it was last
// extended, so both come from whichever side studied more recently. When both
// sides last studied the same day, the longer run is the real one.
function mergeStreak(local, remote) {
  const localDate = local.get('last_study_date');
  const remoteDate = remote.get('last_study_date');
  if (localDate === undefined && remoteDate === undefined) return [];

  const localWins = remoteDate === undefined || (localDate !== undefined && localDate >= remoteDate);
  const date = localWins ? localDate : remoteDate;
  let count = localWins ? local.get('streak_count') : remote.get('streak_count');

  if (localDate !== undefined && localDate === remoteDate) {
    count = String(
      Math.max(Number(local.get('streak_count')) || 0, Number(remote.get('streak_count')) || 0)
    );
  }

  const rows = [{ key: 'last_study_date', value: date }];
  if (count !== undefined) rows.push({ key: 'streak_count', value: count });
  return rows;
}

// Returns the rows to write locally: every syncable key present on either
// side, resolved by the policies above.
export function mergeAppMeta(localRows, remoteRows) {
  const local = new Map(localRows.map((row) => [row.key, row.value]));
  const remote = new Map(remoteRows.map((row) => [row.key, row.value]));

  const merged = [];
  for (const key of new Set([...local.keys(), ...remote.keys()])) {
    if (DEVICE_LOCAL_META_KEYS.has(key) || STREAK_KEYS.includes(key)) continue;
    merged.push({ key, value: mergeMetaValue(key, local.get(key), remote.get(key)) });
  }
  return [...merged, ...mergeStreak(local, remote)];
}

// Review logs from other installs of the same account. Our own rows are
// already here — re-importing them would double-count every stat.
export function remoteLogsToImport(remoteLogs, deviceId) {
  return remoteLogs.filter((log) => log.device_id !== deviceId);
}
