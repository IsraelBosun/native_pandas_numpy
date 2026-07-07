import { useCallback, useState } from 'react';

// Phase machine for the challenge runner: intro (goal + starting table) →
// steps (one decision per screen) → complete (assembled pipeline + result).
// Nothing here touches SM-2 or the review schedule — completion is recorded
// separately via cards.markChallengeComplete.
export function useChallengeSession(challenge) {
  const [phase, setPhase] = useState('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const steps = challenge?.steps ?? [];

  const start = useCallback(() => setPhase('steps'), []);

  const continueStep = useCallback(
    (wasCorrect) => {
      if (wasCorrect) setCorrectCount((count) => count + 1);
      setStepIndex((prev) => {
        const next = prev + 1;
        if (next >= steps.length) {
          setPhase('complete');
          return prev;
        }
        return next;
      });
    },
    [steps.length]
  );

  return {
    phase,
    stepIndex,
    currentStep: steps[stepIndex],
    total: steps.length,
    correctCount,
    start,
    continueStep,
  };
}
