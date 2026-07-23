import { getSession } from './auth';
import { supabase } from './supabase';

// The leaderboard's data layer. Like lib/auth.js, everything here returns
// `{ ... }` on success or `{ error: 'sentence for the user' }` — never throws —
// because every caller is a screen that renders the message. Signed out or
// unconfigured, every call is a no-op error: the leaderboard is opt-in and
// account-gated, and never touches the local learning loop.
//
// Identity (username, opt-in) lives in the cloud `profiles` table, read/written
// directly here — it is NOT part of the offline sync/merge path, so nothing in
// lib/sync.js or lib/merge.js has to know it exists.

const NOT_CONFIGURED = 'Accounts are unavailable in this build.';
const SIGNED_OUT = 'Log in to join the leaderboard.';

function friendlyError(error) {
  const message = error?.message ?? 'Something went wrong. Try again.';
  if (/duplicate key|already exists|unique/i.test(message)) {
    return 'That username is taken. Try another.';
  }
  if (/username_format|violates check|check constraint/i.test(message)) {
    return 'Use 3 to 20 letters, numbers or underscores.';
  }
  if (/network|fetch|failed to/i.test(message)) {
    return 'No connection. Try again when you are back online.';
  }
  return message;
}

async function requireSession() {
  if (!supabase) return { error: NOT_CONFIGURED };
  const session = await getSession();
  if (!session) return { error: SIGNED_OUT };
  return { session };
}

// The signed-in user's profile, or `profile: null` when they have not created
// one yet. Shape: { username, show_on_leaderboard }.
export async function getMyProfile() {
  const gate = await requireSession();
  if (gate.error) return gate;
  const { data, error } = await supabase
    .from('profiles')
    .select('username, show_on_leaderboard')
    .eq('user_id', gate.session.user.id)
    .maybeSingle();
  if (error) return { error: friendlyError(error) };
  return { profile: data ?? null };
}

// Claims (or changes) the username. The DB's unique + format constraints are
// the real gate; friendlyError maps their violations to a sentence.
export async function setUsername(username) {
  const gate = await requireSession();
  if (gate.error) return gate;
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: gate.session.user.id, username }, { onConflict: 'user_id' });
  if (error) return { error: friendlyError(error) };
  return {};
}

export async function setLeaderboardOptIn(optIn) {
  const gate = await requireSession();
  if (gate.error) return gate;
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: gate.session.user.id, show_on_leaderboard: optIn },
      { onConflict: 'user_id' }
    );
  if (error) return { error: friendlyError(error) };
  return {};
}

// Top opted-in learners by XP, computed server-side. Each entry:
// { username, xp, reviews, is_me }.
export async function fetchLeaderboard({ limit = 100 } = {}) {
  const gate = await requireSession();
  if (gate.error) return gate;
  const { data, error } = await supabase.rpc('leaderboard', { row_limit: limit });
  if (error) return { error: friendlyError(error) };
  return { entries: data ?? [] };
}
