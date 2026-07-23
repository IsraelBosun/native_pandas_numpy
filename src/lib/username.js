// Username rules for the leaderboard identity. PURE — no DB, no network. The
// real gate is the `username_format` check constraint in
// scripts/supabase_schema.sql; this is the friendly, pre-flight copy of it, so
// the two must stay in lockstep (letters, digits, underscore, 3-20 chars).
//
// Returns { value } with the trimmed username, or { error } with a sentence
// ready to show the user — same shape lib/auth.js uses.

const USERNAME_RE = /^[A-Za-z0-9_]+$/;
const MIN = 3;
const MAX = 20;

export function validateUsername(raw) {
  const value = (raw ?? '').trim();
  if (value.length === 0) return { error: 'Pick a username.' };
  if (value.length < MIN) return { error: `Usernames need at least ${MIN} characters.` };
  if (value.length > MAX) return { error: `Usernames can be at most ${MAX} characters.` };
  if (!USERNAME_RE.test(value)) {
    return { error: 'Use only letters, numbers and underscores.' };
  }
  return { value };
}
