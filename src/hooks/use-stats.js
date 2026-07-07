import { useCallback, useEffect, useState } from 'react';

import { getReviewHeatmap, getRetentionSeries, getWeakestTopics } from '@/lib/cards';

export function useReviewHeatmap({ weeks } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getReviewHeatmap({ weeks });
    setData(result);
    setLoading(false);
  }, [weeks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export function useRetentionSeries({ days } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getRetentionSeries({ days });
    setData(result);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export function useWeakestTopics({ limit } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getWeakestTopics({ limit });
    setData(result);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
