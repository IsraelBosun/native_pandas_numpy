import { useCallback, useState } from 'react';

import { getDeck } from '@/lib/content';
import { seededShuffle } from '@/lib/shuffle';

// Practice's "cram mode": every card in a topic (not just due ones), shuffled
// once per mount, and grading here never calls schedule()/recordReview() —
// this is purely local, ephemeral self-checking with no persisted state.
export function useCramSession({ topic }) {
  const [queue] = useState(() => seededShuffle(getDeck(topic).cards, `${topic}-${Date.now()}`));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [complete, setComplete] = useState(queue.length === 0);
  const [stats, setStats] = useState({ reviewed: 0, missed: 0 });

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
    loading: false,
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
