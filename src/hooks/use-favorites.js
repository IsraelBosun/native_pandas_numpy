import { useCallback, useEffect, useState } from 'react';

import { getFavoriteCards } from '@/lib/cards';

export function useFavoritesCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const cards = await getFavoriteCards();
    setCount(cards.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, loading, refresh };
}
