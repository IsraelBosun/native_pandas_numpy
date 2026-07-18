import { useCallback, useEffect, useState } from 'react';

import { getFavoriteCards } from '@/lib/cards';
import { seededShuffle } from '@/lib/shuffle';

// Same ephemeral self-check contract as useCramSession — never calls
// schedule()/recordReview() — but sources its queue from starred cards across
// every topic instead of one topic's deck, so it needs an async fetch first.
export function useFavoritesSession() {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, missed: 0 });

  useEffect(() => {
    let cancelled = false;
    getFavoriteCards().then((cards) => {
      if (cancelled) return;
      setQueue(seededShuffle(cards, `favorites-${Date.now()}`));
      setLoading(false);
      if (cards.length === 0) setComplete(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentCard = queue[index];

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    (gradeValue) => {
      setStats((prev) => ({
        reviewed: prev.reviewed + 1,
        missed: prev.missed + (gradeValue === 2 ? 1 : 0),
      }));
      setRevealed(false);
      setIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= queue.length) setComplete(true);
        return nextIndex;
      });
    },
    [queue.length]
  );

  return {
    loading,
    complete,
    currentCard,
    revealed,
    reveal,
    grade,
    position: index + 1,
    total: queue.length,
    stats,
  };
}
