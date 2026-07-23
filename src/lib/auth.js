import * as Linking from 'expo-linking';

import { supabase } from './supabase';

// Thin wrapper over supabase.auth. Accounts are entirely optional: with no
// Supabase keys configured, or with nobody signed in, the app runs exactly as
// it did before accounts existed — local SQLite is always the source of truth
// (CLAUDE.md §9). Signing in only adds a backup/restore target.
//
// Errors come back as `{ error: 'sentence for the user' }` rather than throwing,
// because every caller here is a form that needs to render the message.

export const authAvailable = supabase !== null;

const NOT_CONFIGURED = 'Accounts are unavailable in this build.';

// Supabase's messages are aimed at developers ("Invalid login credentials",
// "AuthApiError: ..."). Map the ones users actually hit.
function friendlyError(error) {
  const message = error?.message ?? 'Something went wrong. Try again.';
  if (/invalid login credentials/i.test(message)) {
    return 'That email and password combination is incorrect.';
  }
  if (/user already registered/i.test(message)) {
    return 'An account already exists for that email — log in instead.';
  }
  if (/password should be at least/i.test(message)) {
    return 'Passwords need to be at least 6 characters.';
  }
  if (/email.*invalid|invalid.*email/i.test(message)) {
    return 'That does not look like a valid email address.';
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many attempts — wait a minute and try again.';
  }
  if (/new password should be different/i.test(message)) {
    return 'Your new password must be different from your old one.';
  }
  if (/auth session missing|session.*not.*found|invalid.*(jwt|token)|expired/i.test(message)) {
    return 'This reset link has expired. Request a new one from the log in screen.';
  }
  if (/network|fetch/i.test(message)) {
    return 'No connection. Your progress is safe on this device — try again later.';
  }
  return message;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

// Fires on sign in, sign out, and token refresh. Returns an unsubscribe fn.
export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// When email confirmation is on in the Supabase dashboard, signUp returns a
// user but no session — the caller should tell them to check their inbox.
export async function signUp(email, password) {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) return { error: friendlyError(error) };
  return { session: data.session ?? null, needsConfirmation: data.session === null };
}

export async function signIn(email, password) {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { error: friendlyError(error) };
  return { session: data.session };
}

export async function signOut() {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.auth.signOut();
  if (error) return { error: friendlyError(error) };
  return {};
}

// The reset email links back into the app via the nativepandas:// scheme, so
// the recovery session lands on our reset-password screen. This redirect must
// be allow-listed in Supabase → Authentication → URL Configuration.
export async function sendPasswordReset(email) {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: Linking.createURL('auth/reset-password'),
  });
  if (error) return { error: friendlyError(error) };
  return {};
}

// Installs the short-lived session carried by a recovery deep link so the
// subsequent updateUser({ password }) is authorized as this user.
export async function beginRecovery({ accessToken, refreshToken }) {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) return { error: friendlyError(error) };
  return {};
}

export async function updatePassword(password) {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendlyError(error) };
  return {};
}
