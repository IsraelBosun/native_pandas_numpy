// Pure parser for the deep link Supabase opens after a password-recovery email
// is confirmed. Kept free of DB/React/network so it can be unit-tested like
// lib/scheduler.js and lib/merge.js.
//
// Our Supabase client uses the implicit flow, so the session comes back in the
// URL fragment:
//   nativepandas://auth/reset-password#access_token=...&refresh_token=...&type=recovery
// An expired or already-used link comes back as an error instead:
//   nativepandas://auth/reset-password#error=access_denied&error_description=Email+link+is+invalid
// Params are read from both the query and the fragment, so a future switch to a
// query-param (PKCE-style) link keeps working without touching this parser.

function safeDecode(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function collectParams(url) {
  const params = {};
  const start = url.search(/[?#]/);
  if (start === -1) return params;
  for (const pair of url.slice(start + 1).split(/[&?#]/)) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = safeDecode(eq === -1 ? pair : pair.slice(0, eq));
    const value = eq === -1 ? '' : safeDecode(pair.slice(eq + 1));
    // First occurrence wins — query params shouldn't be overwritten by an
    // empty fragment key of the same name.
    if (!(key in params)) params[key] = value;
  }
  return params;
}

// Returns one of:
//   { type: 'recovery', accessToken, refreshToken }  — ready to set a session
//   { type: 'error', message }                        — link expired/invalid
//   null                                              — not a recovery link
export function parseRecoveryLink(url) {
  if (typeof url !== 'string' || url.length === 0) return null;
  const params = collectParams(url);

  if (params.error || params.error_description) {
    return {
      type: 'error',
      message: params.error_description || params.error || 'This reset link is no longer valid.',
    };
  }
  if (params.type === 'recovery' && params.access_token && params.refresh_token) {
    return {
      type: 'recovery',
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
    };
  }
  return null;
}
