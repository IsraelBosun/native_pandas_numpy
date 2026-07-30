import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChartView } from '@/components/chart-view';
import { CodeBlock } from '@/components/code-block';
import { ChallengeStep } from '@/components/practice/challenge-step';
import { ProgressBar } from '@/components/progress-bar';
import { DataTable } from '@/components/review/data-table';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChallengeSession } from '@/hooks/use-challenge-session';
import { useTheme } from '@/hooks/use-theme';
import { getChallengeResult, markChallengeComplete } from '@/lib/cards';
import { getChallenge } from '@/lib/challenges';

const MAX_TABLE_ROWS = 12;

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const challenge = getChallenge(id);
  const session = useChallengeSession(challenge);

  // undefined = still loading the saved result; null = never completed;
  // object = the metrics from the last completion, replayed on re-open.
  const [savedResult, setSavedResult] = useState(undefined);
  const [redoing, setRedoing] = useState(false);

  useEffect(() => {
    let active = true;
    getChallengeResult(id).then((result) => {
      if (active) setSavedResult(result);
    });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (session.phase === 'complete') {
      const stats = { correctCount: session.correctCount, total: session.total };
      markChallengeComplete(challenge.id, stats);
      setSavedResult({ ...stats, completedAt: null });
    }
  }, [session.phase, challenge?.id, session.correctCount, session.total]);

  if (!challenge) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText themeColor="textSecondary">Challenge not found.</ThemedText>
      </ThemedView>
    );
  }

  if (savedResult === undefined) {
    // Hold the intro back until we know whether this challenge is already done,
    // so a completed one opens straight to its summary without a flash.
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} />
      </ThemedView>
    );
  }

  // A previously completed challenge re-opens to its saved summary; the live
  // session runs only on a first play or after the user taps Redo.
  const showSaved = savedResult && !redoing && session.phase !== 'complete';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.progressWrap}>
            <ProgressBar
              progress={
                showSaved || session.phase === 'complete'
                  ? 1
                  : session.phase === 'intro'
                    ? 0
                    : session.stepIndex / session.total
              }
              color={theme.action}
            />
          </View>
        </View>

        {showSaved && (
          <Complete
            challenge={challenge}
            correctCount={savedResult.correctCount}
            total={savedResult.total}
            completedAt={savedResult.completedAt}
            onDone={() => router.back()}
            onRedo={() => setRedoing(true)}
            theme={theme}
          />
        )}
        {!showSaved && session.phase === 'intro' && (
          <Intro challenge={challenge} onStart={session.start} theme={theme} />
        )}
        {!showSaved && session.phase === 'steps' && (
          <>
            <ThemedText themeColor="textSecondary" type="small" style={styles.counter}>
              Step {session.stepIndex + 1}/{session.total}
            </ThemedText>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              <ChallengeStep
                key={session.currentStep.id}
                step={session.currentStep}
                tableStates={challenge.tableStates}
                datasetName={challenge.datasetName}
                onContinue={session.continueStep}
              />
            </ScrollView>
          </>
        )}
        {!showSaved && session.phase === 'complete' && (
          <Complete
            challenge={challenge}
            correctCount={session.correctCount}
            total={session.total}
            onDone={() => router.back()}
            theme={theme}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function Intro({ challenge, onStart, theme }) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="title">{challenge.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {challenge.difficulty} · ~{challenge.minutes} min · {challenge.steps.length} steps
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.goal}>
          {challenge.goal}
        </ThemedText>
        <DataTable
          tables={[{ name: challenge.datasetName, table: challenge.tableStates.step0 }]}
          maxRows={MAX_TABLE_ROWS}
        />
      </ScrollView>
      <PrimaryButton label="Start cleaning" onPress={onStart} theme={theme} />
    </>
  );
}

function Complete({ challenge, correctCount, total, completedAt, onDone, onRedo, theme }) {
  const pipeline = challenge.steps
    .map((step) => step.codeLine)
    .filter(Boolean)
    .join('\n');
  // A pipeline can end in a chart rather than a table, so the result section
  // shows the final chart if there is one, and otherwise the last table state
  // any step produced — which is no longer necessarily the last step's.
  const finalChart = [...challenge.steps].reverse().find((step) => step.chart)?.chart;
  const lastTableStep = [...challenge.steps].reverse().find((step) => step.tableAfter);
  const finalTable = lastTableStep && challenge.tableStates[lastTableStep.tableAfter];
  const hasScore = correctCount != null && total != null;

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Feather name="check-circle" size={40} color={theme.success} style={styles.completeIcon} />
        <ThemedText type="title">Pipeline complete</ThemedText>
        <ThemedText themeColor="textSecondary">
          {hasScore
            ? `${correctCount} of ${total} steps correct on the first try.`
            : 'You completed this pipeline.'}
        </ThemedText>
        {completedAt && (
          <ThemedText type="small" themeColor="textSecondary">
            Completed {completedAt}
          </ThemedText>
        )}

        <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
          The pipeline you built
        </ThemedText>
        <CodeBlock code={pipeline} />

        <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
          Result
        </ThemedText>
        {finalTable && (
          <DataTable
            tables={[{ name: lastTableStep.resultVar ?? challenge.datasetName, table: finalTable }]}
            maxRows={MAX_TABLE_ROWS}
          />
        )}
        {finalChart && <ChartView chart={finalChart} />}
      </ScrollView>
      {onRedo && <SecondaryButton label="Redo challenge" onPress={onRedo} theme={theme} />}
      <PrimaryButton label="Done" onPress={onDone} theme={theme} />
    </>
  );
}

function PrimaryButton({ label, onPress, theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: theme.action },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={styles.primaryButtonText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.action }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressWrap: {
    flex: 1,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  goal: {
    fontSize: 16,
    lineHeight: 24,
  },
  completeIcon: {
    marginTop: Spacing.four,
  },
  sectionLabel: {
    marginTop: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
