import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  authAvailable,
  beginRecovery as apiBeginRecovery,
  getSession,
  onAuthChange,
  sendPasswordReset,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
  updatePassword as apiUpdatePassword,
} from '@/lib/auth';
import { bootstrap } from '@/lib/bootstrap';
import { clearLocalProgress, setSyncedUserId } from '@/lib/cards';
import { adoptAccount, syncNow } from '@/lib/sync';

const AuthContext = createContext(null);

// Owns the signed-in session AND the local-data consequences of changing it:
// signing in merges this device's progress into the account, signing out
// pushes anything outstanding and then hands the device back empty. Screens
// only ever see the resulting session.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(authAvailable);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authAvailable) return undefined;

    // bootstrap() is idempotent — awaiting it guarantees the tables the sync
    // path writes to exist before a restored session can trigger one.
    bootstrap()
      .then(getSession)
      .then((restored) => {
        setSession(restored);
        setLoading(false);
        if (restored) syncNow();
      })
      .catch(() => setLoading(false));

    return onAuthChange(setSession);
  }, []);

  const signIn = useCallback(async (email, password) => {
    setBusy(true);
    try {
      const result = await apiSignIn(email, password);
      if (result.error) return result;
      await adoptAccount();
      return {};
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(async (email, password) => {
    setBusy(true);
    try {
      const result = await apiSignUp(email, password);
      if (result.error) return result;
      // Email confirmation is on: there's no session yet, so there's nothing
      // to sync to. Their local progress is untouched and will be adopted
      // whenever they come back and log in.
      if (result.needsConfirmation) return { needsConfirmation: true };
      await adoptAccount();
      return {};
    } finally {
      setBusy(false);
    }
  }, []);

  // Pushes first so nothing studied offline is lost, then wipes — the device
  // must not hand the next person this account's progress.
  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await syncNow();
      const result = await apiSignOut();
      if (result.error) return result;
      await setSyncedUserId(null);
      await clearLocalProgress();
      return {};
    } finally {
      setBusy(false);
    }
  }, []);

  // A recovery deep link carries a session but no local-data change: the user
  // hasn't switched accounts, they're re-authenticating into the one they
  // already had, so this just installs the session for updateUser() to use.
  const beginRecovery = useCallback((tokens) => apiBeginRecovery(tokens), []);

  // Mirrors signIn: set the new password, then merge/pull so a returning user
  // on a fresh install gets their cloud progress right after resetting.
  const completePasswordReset = useCallback(async (newPassword) => {
    setBusy(true);
    try {
      const result = await apiUpdatePassword(newPassword);
      if (result.error) return result;
      await adoptAccount();
      return {};
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      available: authAvailable,
      session,
      user: session?.user ?? null,
      email: session?.user?.email ?? null,
      signedIn: session !== null,
      loading,
      busy,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      beginRecovery,
      completePasswordReset,
    }),
    [session, loading, busy, signIn, signUp, signOut, beginRecovery, completePasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
