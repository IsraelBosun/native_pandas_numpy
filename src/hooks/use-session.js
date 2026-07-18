import { useCallback, useEffect, useState } from 'react';

import { checkAchievements, getDueCards, recordReview, setFavorite, setNote } from '@/lib/cards';
import { syncNow } from '@/lib/sync';
import { xpForGrade } from '@/lib/xp';

// How many cards later an Again card resurfaces within the current session.
const AGAIN_REQUEUE_OFFSET = 3;

export function useSession({ topic } = {}) {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [suggestedGrade, setSuggestedGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, missed: 0, xp: 0 });
  const [combo, setCombo] = useState(0);
  const [newAchievements, setNewAchievements] = useState([]);

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
  // fire-and-forget, so an offline session ends exactly like before. Same
  // moment, check for newly-unlocked achievements (perfect-session needs the
  // final missed/reviewed tally, which only exists once the queue is done).
  useEffect(() => {
    if (complete && !loading) {
      syncNow();
      checkAchievements({ perfectSession: stats.reviewed > 0 && stats.missed === 0 }).then(setNewAchievements);
    }
  }, [complete, loading, stats]);

  const currentCard = queue[index];

  // Auto-checked card types (fill-blank, multiple-choice) can pass a grade
  // suggestion derived from how cleanly the user answered — GradeButtons
  // pre-highlights it so the common case is a one-tap confirm.
  const reveal = useCallback((suggestion = null) => {
    setRevealed(true);
    setSuggestedGrade(suggestion);
  }, []);

  const grade = useCallback(
    async (gradeValue) => {
      if (!currentCard) return;
      await recordReview(currentCard.id, gradeValue);

      setStats((prev) => ({
        reviewed: prev.reviewed + 1,
        missed: prev.missed + (gradeValue === 2 ? 1 : 0),
        xp: prev.xp + xpForGrade(gradeValue),
      }));
      setCombo((prev) => (gradeValue === 2 ? 0 : prev + 1));

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
      setSuggestedGrade(null);
    },
    [currentCard, index]
  );

  // Optimistically patch the current queue item so the star/note UI reflects
  // the change immediately, without waiting on a refetch.
  const patchCurrentCard = useCallback(
    (patch) => {
      setQueue((prevQueue) => prevQueue.map((card, i) => (i === index ? { ...card, ...patch } : card)));
    },
    [index]
  );

  const toggleFavorite = useCallback(() => {
    if (!currentCard) return;
    const next = !currentCard.favorite;
    patchCurrentCard({ favorite: next });
    setFavorite(currentCard.id, next);
  }, [currentCard, patchCurrentCard]);

  const updateNote = useCallback(
    (text) => {
      if (!currentCard) return;
      patchCurrentCard({ note: text });
      setNote(currentCard.id, text);
    },
    [currentCard, patchCurrentCard]
  );

  return {
    loading,
    complete,
    currentCard,
    revealed,
    suggestedGrade,
    reveal,
    grade,
    combo,
    position: index + 1,
    total: queue.length,
    stats,
    newAchievements,
    toggleFavorite,
    updateNote,
  };
}
