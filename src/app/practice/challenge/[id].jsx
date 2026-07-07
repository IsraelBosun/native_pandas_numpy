import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CodeBlock } from '@/components/code-block';
import { ChallengeStep } from '@/components/practice/challenge-step';
import { ProgressBar } from '@/components/progress-bar';
import { DataTable } from '@/components/review/data-table';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChallengeSession } from '@/hooks/use-challenge-session';
import { useTheme } from '@/hooks/use-theme';
import { markChallengeComplete } from '@/lib/cards';
import { getChallenge } from '@/lib/challenges';

const MAX_TABLE_ROWS = 12;

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const challenge = getChallenge(id);
  const session = useChallengeSession(challenge);

  useEffect(() => {
    if (session.phase === 'complete') markChallengeComplete(challenge.id);
  }, [session.phase, challenge?.id]);

  if (!challenge) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText themeColor="textSecondary">Challenge not found.</ThemedText>
      </ThemedView>
    );
  }

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
                session.phase === 'complete'
                  ? 1
                  : session.phase === 'intro'
                    ? 0
                    : session.stepIndex / session.total
              }
              color={theme.action}
            />
          </View>
        </View>

        {session.phase === 'intro' && <Intro challenge={challenge} onStart={session.start} theme={theme} />}
        {session.phase === 'steps' && (
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
        {session.phase === 'complete' && (
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

function Complete({ challenge, correctCount, total, onDone, theme }) {
  const pipeline = challenge.steps
    .map((step) => step.codeLine)
    .filter(Boolean)
    .join('\n');
  const lastStep = challenge.steps[challenge.steps.length - 1];
  const finalTable = challenge.tableStates[lastStep.tableAfter];

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Feather name="check-circle" size={40} color={theme.success} style={styles.completeIcon} />
        <ThemedText type="title">Pipeline complete</ThemedText>
        <ThemedText themeColor="textSecondary">
          {correctCount} of {total} steps correct on the first try.
        </ThemedText>

        <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
          The pipeline you built
        </ThemedText>
        <CodeBlock code={pipeline} />

        <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
          Result
        </ThemedText>
        <DataTable
          tables={[{ name: lastStep.resultVar ?? challenge.datasetName, table: finalTable }]}
          maxRows={MAX_TABLE_ROWS}
        />
      </ScrollView>
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
  pressed: {
    opacity: 0.85,
  },
});
