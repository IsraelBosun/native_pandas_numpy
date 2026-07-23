import { useCallback, useEffect, useState } from 'react';

import { getChallengeResults } from '@/lib/cards';
import { CHALLENGES } from '@/lib/challenges';

export function useChallenges() {
  const [results, setResults] = useState(() => ({}));

  const refresh = useCallback(() => {
    getChallengeResults().then(setResults);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const challenges = CHALLENGES.map((challenge) => {
    const result = results[challenge.id] ?? null;
    return {
      id: challenge.id,
      title: challenge.title,
      subtitle: challenge.subtitle,
      difficulty: challenge.difficulty,
      minutes: challenge.minutes,
      stepCount: challenge.steps.length,
      completed: !!result,
      correctCount: result?.correctCount ?? null,
      total: result?.total ?? null,
    };
  });

  return { challenges, refresh };
}
