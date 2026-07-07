import { useCallback, useEffect, useState } from 'react';

import { getDueCards } from '@/lib/cards';

export function useDueCards({ topic, limit } = {}) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const due = await getDueCards({ topic, limit });
    setCards(due);
    setLoading(false);
  }, [topic, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { cards, loading, refresh };
}
