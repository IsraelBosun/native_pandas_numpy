import { useCallback, useEffect, useState } from 'react';

import { getAchievements } from '@/lib/cards';

export function useAchievements() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getAchievements();
    setAchievements(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { achievements, loading, refresh };
}
