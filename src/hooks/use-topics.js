import { useCallback, useEffect, useState } from 'react';

import { getAllTopicsMastery } from '@/lib/cards';

export function useTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getAllTopicsMastery();
    setTopics(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { topics, loading, refresh };
}
