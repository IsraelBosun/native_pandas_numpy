import { useCallback, useMemo, useRef, useState } from 'react';

import { buildQuizQueue } from '@/lib/race/quiz-pool';
import { CORRECT_COIN_BONUS, STARTING_LIVES } from '@/lib/race/scoring';

// Ungraded, ephemeral in-race scoring for Race mode — mirrors
// use-cram-session.js's discipline: never imports lib/cards.js or lib/db.js,
// never calls schedule()/recordReview(), never persists anything. A race
// result must never touch the real SM-2 review schedule.
export function useRaceSession({ topic }) {
  const [quizQueue] = useState(() => buildQuizQueue(topic, `race-${topic}-${Date.now()}`));
  const [quizIndex, setQuizIndex] = useState(0);
  const [phase, setPhase] = useState('racing'); // 'racing' | 'quiz' | 'gameover'
  const [lives, setLives] = useState(STARTING_LIVES);
  const [coins, setCoins] = useState(0);
  const [quizStats, setQuizStats] = useState({ correct: 0, attempted: 0 });
  const [finalScore, setFinalScore] = useState(0);

  // Lives need to be read synchronously at the moment of collision (to
  // decide game-over) — a ref avoids relying on the React state batching
  // order that a functional setState updater would require instead.
  const livesRef = useRef(STARTING_LIVES);

  const currentQuizCard = useMemo(
    () => (quizQueue.length > 0 ? quizQueue[quizIndex % quizQueue.length] : null),
    [quizQueue, quizIndex]
  );

  const startQuiz = useCallback(() => {
    setPhase((prev) => (prev === 'racing' ? 'quiz' : prev));
  }, []);

  const handleQuizAnswer = useCallback((isCorrect) => {
    setQuizStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      attempted: prev.attempted + 1,
    }));
    if (isCorrect) setCoins((prev) => prev + CORRECT_COIN_BONUS);
    setQuizIndex((prev) => prev + 1);
    setPhase('racing');
  }, []);

  const handleCoinCollect = useCallback(() => {
    setCoins((prev) => prev + 1);
  }, []);

  // Returns whether this hit ended the run, so the caller can also stop the
  // engine's frame loop.
  const handleCollision = useCallback(() => {
    livesRef.current = Math.max(livesRef.current - 1, 0);
    setLives(livesRef.current);
    return livesRef.current <= 0;
  }, []);

  const endRun = useCallback((score) => {
    setFinalScore(score);
    setPhase('gameover');
  }, []);

  return {
    phase,
    lives,
    coins,
    quizStats,
    currentQuizCard,
    finalScore,
    startQuiz,
    handleQuizAnswer,
    handleCoinCollect,
    handleCollision,
    endRun,
  };
}
