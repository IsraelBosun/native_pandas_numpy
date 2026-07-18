import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { bootstrap } from '@/lib/bootstrap';
import { getThemePreference, setThemePreference as persistThemePreference } from '@/lib/cards';

// 'system' | 'light' | 'dark'.
const ThemePreferenceContext = createContext(null);

export function ThemePreferenceProvider({ children }) {
  const [preference, setPreferenceState] = useState('system');

  useEffect(() => {
    // bootstrap() is idempotent (memoized) — awaiting it here just guarantees
    // app_meta exists before this first read, regardless of whether the root
    // layout's own bootstrap() call has resolved yet.
    bootstrap()
      .then(getThemePreference)
      .then(setPreferenceState);
  }, []);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    persistThemePreference(next);
  }, []);

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return ctx;
}
