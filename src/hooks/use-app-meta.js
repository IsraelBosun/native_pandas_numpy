import { useCallback, useEffect, useState } from 'react';

import { getStreak } from '@/lib/cards';

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const value = await getStreak();
    setStreak(value);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { streak, loading, refresh };
}
