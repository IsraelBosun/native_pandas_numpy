import { useCallback, useEffect, useState } from 'react';

import { getFavoriteCards, setFavorite } from '@/lib/cards';
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

  // Optimistically patch the current queue item so the star UI reflects the
  // change immediately, without waiting on a refetch.
  const patchCurrentCard = useCallback(
    (patch) => {
      setQueue((prevQueue) => prevQueue.map((card, i) => (i === index ? { ...card, ...patch } : card)));
    },
    [index]
  );

  // Unstarring here doesn't remove the card from *this* session's queue (its
  // position/total would get confusing mid-session) — it just persists, so
  // the card is correctly gone next time the Starred queue is loaded fresh.
  const toggleFavorite = useCallback(() => {
    if (!currentCard) return;
    const next = !currentCard.favorite;
    patchCurrentCard({ favorite: next });
    setFavorite(currentCard.id, next);
  }, [currentCard, patchCurrentCard]);

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
    toggleFavorite,
    position: index + 1,
    total: queue.length,
    stats,
  };
}
