import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuizOverlay } from '@/components/race/quiz-overlay';
import { RaceHud } from '@/components/race/race-hud';
import { RaceSummary } from '@/components/race/race-summary';
import { RaceTrack } from '@/components/race/race-track';
import { triggerHaptic } from '@/components/scale-pressable';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRaceEngine } from '@/hooks/use-race-engine';
import { useRaceSession } from '@/hooks/use-race-session';
import { useTheme, useTopicHues } from '@/hooks/use-theme';
import { TOPICS } from '@/lib/content';
import { LANE_COUNT } from '@/lib/race/lanes';
import { scoreForDistance } from '@/lib/race/scoring';
import { playSound } from '@/lib/sound';

// Most spawns are obstacles to dodge, a minority are coins to collect —
// keeps the lane always demanding a decision without making coins rare.
const OBSTACLE_SPAWN_CHANCE = 0.75;
const SCORE_POLL_MS = 200;

export default function RaceScreen() {
  const { topic } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const hues = useTopicHues();
  const topicMeta = TOPICS.find((t) => t.id === topic);
  const identity = hues[topicMeta?.hue] ?? hues.blue;

  const session = useRaceSession({ topic });

  // The frame loop's onSpawn/onQuizTrigger callbacks need to read the engine
  // (speedMultiplier, pauseForQuiz) but the engine is only created by the
  // useRaceEngine call these same callbacks are passed into — a ref breaks
  // the circularity without forcing the engine's identity to change.
  const engineRef = useRef(null);
  const spawnIdRef = useRef(0);

  const [trackSize, setTrackSize] = useState({ width: 0, height: 0 });
  const [obstacles, setObstacles] = useState([]);
  const [coins, setCoins] = useState([]);
  const [scoreDisplay, setScoreDisplay] = useState(0);

  const handleSpawn = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const kind = Math.random() < OBSTACLE_SPAWN_CHANCE ? 'obstacle' : 'coin';
    // Speed multiplier is read once here, not bound reactively — a boost/
    // slowdown that starts mid-flight only affects entities spawned after it.
    const entity = { id: `${kind}-${spawnIdRef.current++}`, lane, speedMultiplier: engine.speedMultiplier.value };
    if (kind === 'obstacle') setObstacles((prev) => [...prev, entity]);
    else setCoins((prev) => [...prev, entity]);
  }, []);

  const handleQuizTrigger = useCallback(() => {
    engineRef.current?.pauseForQuiz();
    session.startQuiz();
  }, [session]);

  const engine = useRaceEngine({
    trackWidth: trackSize.width,
    onSpawn: handleSpawn,
    onQuizTrigger: handleQuizTrigger,
  });
  engineRef.current = engine;

  const handleLayoutSize = useCallback((width, height) => {
    setTrackSize({ width, height });
  }, []);

  const handleSwipe = useCallback(
    (direction) => {
      if (session.phase !== 'racing') return;
      engine.shiftLane(direction);
    },
    [session.phase, engine]
  );

  const handleObstacleCollision = useCallback(
    (id) => {
      setObstacles((prev) => prev.filter((o) => o.id !== id));
      engine.triggerInvulnerability();
      playSound('crash');
      triggerHaptic('error');
      const isGameOver = session.handleCollision();
      if (isGameOver) {
        engine.stop();
        session.endRun(scoreForDistance(engine.getDistance()));
      }
    },
    [engine, session]
  );

  const handleObstacleOffscreen = useCallback((id) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const handleCoinCollect = useCallback(
    (id) => {
      setCoins((prev) => prev.filter((c) => c.id !== id));
      session.handleCoinCollect();
    },
    [session]
  );

  const handleCoinOffscreen = useCallback((id) => {
    setCoins((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleQuizAnswer = useCallback(
    (isCorrect) => {
      if (isCorrect) {
        engine.applyBoost();
        playSound('boost');
      } else {
        engine.applySlowdown();
      }
      engine.resumeFromQuiz();
      session.handleQuizAnswer(isCorrect);
    },
    [engine, session]
  );

  useEffect(() => {
    if (session.phase === 'gameover') return undefined;
    const interval = setInterval(() => {
      setScoreDisplay(scoreForDistance(engine.getDistance()));
    }, SCORE_POLL_MS);
    return () => clearInterval(interval);
  }, [session.phase, engine]);

  if (session.phase === 'gameover') {
    return (
      <RaceSummary
        score={session.finalScore}
        coins={session.coins}
        quizStats={session.quizStats}
        onDone={() => router.back()}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <RaceHud
            lives={session.lives}
            coins={session.coins}
            score={scoreDisplay}
            topicLabel={topicMeta?.label ?? 'Race'}
            hue={identity}
          />
        </View>

        <View style={styles.trackWrap}>
          <RaceTrack
            engine={engine}
            obstacles={obstacles}
            coins={coins}
            onSwipe={handleSwipe}
            onLayoutSize={handleLayoutSize}
            trackWidth={trackSize.width}
            trackHeight={trackSize.height}
            onObstacleCollision={handleObstacleCollision}
            onObstacleOffscreen={handleObstacleOffscreen}
            onCoinCollect={handleCoinCollect}
            onCoinOffscreen={handleCoinOffscreen}
          />

          {session.phase === 'quiz' && session.currentQuizCard && (
            <QuizOverlay card={session.currentQuizCard} onAnswer={handleQuizAnswer} />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  trackWrap: {
    flex: 1,
  },
});
