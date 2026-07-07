import { useCallback, useEffect, useState } from 'react';

import { getDueCards, recordReview } from '@/lib/cards';
import { syncNow } from '@/lib/sync';

// How many cards later an Again card resurfaces within the current session.
const AGAIN_REQUEUE_OFFSET = 3;

export function useSession({ topic } = {}) {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, missed: 0 });

  useEffect(() => {
    let cancelled = false;
    getDueCards({ topic }).then((due) => {
      if (cancelled) return;
      setQueue(due);
      setLoading(false);
      if (due.length === 0) setComplete(true);
    });
    return () => {
      cancelled = true;
    };
  }, [topic]);

  useEffect(() => {
    if (!loading && !complete && queue.length > 0 && index >= queue.length) {
      setComplete(true);
    }
  }, [index, queue.length, loading, complete]);

  // Push this session's progress to Supabase once the queue is done —
  // fire-and-forget, so an offline session ends exactly like before.
  useEffect(() => {
    if (complete && !loading) syncNow();
  }, [complete, loading]);

  const currentCard = queue[index];

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    async (gradeValue) => {
      if (!currentCard) return;
      await recordReview(currentCard.id, gradeValue);

      setStats((prev) => ({
        reviewed: prev.reviewed + 1,
        missed: prev.missed + (gradeValue === 2 ? 1 : 0),
      }));

      if (gradeValue === 2) {
        // Again requeues near the end of the current in-session queue — this
        // is purely in-memory session behavior, not persisted anywhere.
        setQueue((prevQueue) => {
          const withoutCurrent = [...prevQueue.slice(0, index), ...prevQueue.slice(index + 1)];
          const insertAt = Math.min(withoutCurrent.length, index + AGAIN_REQUEUE_OFFSET);
          return [...withoutCurrent.slice(0, insertAt), currentCard, ...withoutCurrent.slice(insertAt)];
        });
        // index stays put: removing the current slot shifts the next card
        // into it, so the pointer doesn't need to move.
      } else {
        setIndex((prevIndex) => prevIndex + 1);
      }

      setRevealed(false);
    },
    [currentCard, index]
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
