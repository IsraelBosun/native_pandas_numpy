import { useCallback, useEffect, useState } from 'react';

import { getCompletedChallenges } from '@/lib/cards';
import { CHALLENGES } from '@/lib/challenges';

export function useChallenges() {
  const [completedIds, setCompletedIds] = useState(() => new Set());

  const refresh = useCallback(() => {
    getCompletedChallenges().then((ids) => setCompletedIds(new Set(ids)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const challenges = CHALLENGES.map((challenge) => ({
    id: challenge.id,
    title: challenge.title,
    subtitle: challenge.subtitle,
    difficulty: challenge.difficulty,
    minutes: challenge.minutes,
    stepCount: challenge.steps.length,
    completed: completedIds.has(challenge.id),
  }));

  return { challenges, refresh };
}
