import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Sync is optional infrastructure: with no keys configured (or placeholder
// values), `supabase` is null and the app runs fully local, exactly as
// before Supabase existed. lib/sync.js checks for this.
const configured = url?.startsWith('https://') && anonKey && !anonKey.startsWith('PASTE');

export const supabase = configured
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
