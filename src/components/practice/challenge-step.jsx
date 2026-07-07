import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CodeBlock } from '@/components/code-block';
import { DataTable } from '@/components/review/data-table';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { seededShuffle } from '@/lib/shuffle';

const BLANK_MARKER = '___';
const MAX_TABLE_ROWS = 12;

// One-line summary of what the step's operation did to the table, shown
// under the "after" snapshot (e.g. "10 rows → 8 rows", "new column: month").
function deltaText(before, after) {
  const parts = [];
  if (before.rows.length !== after.rows.length) {
    parts.push(`${before.rows.length} rows → ${after.rows.length} rows`);
  }
  const newColumns = after.columns.filter((col) => !before.columns.includes(col));
  if (newColumns.length > 0) {
    parts.push(`new column: ${newColumns.join(', ')}`);
  }
  return parts.join(' · ') || null;
}

export function ChallengeStep({ step, tableStates, datasetName, onContinue }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(null);

  const isFillBlank = step.type === 'fill-blank';
  const correctValue = isFillBlank ? step.tokens[0] : step.answer;
  const options = useMemo(
    () => seededShuffle([correctValue, ...step.distractors], step.id),
    [step.id, correctValue, step.distractors]
  );

  const answered = selected !== null;
  const isCorrect = selected === correctValue;
  const before = tableStates[step.table];
  const after = step.tableAfter ? tableStates[step.tableAfter] : null;
  const delta = after ? deltaText(before, after) : null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.prompt}>{step.prompt}</ThemedText>

      <DataTable tables={[{ name: datasetName, table: before }]} maxRows={MAX_TABLE_ROWS} />

      {isFillBlank ? (
        <FillBlankInteraction
          step={step}
          options={options}
          selected={selected}
          onSelect={setSelected}
          theme={theme}
        />
      ) : (
        <ChoiceInteraction
          step={step}
          options={options}
          selected={selected}
          onSelect={setSelected}
          theme={theme}
        />
      )}

      {answered && (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.outcome}>
          <ThemedText type="smallBold" style={{ color: isCorrect ? theme.success : theme.danger }}>
            {isCorrect ? 'Correct' : `Not quite — correct answer: ${correctValue}`}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{step.why}</ThemedText>

          {after && (
            <>
              <ThemedText type="label" themeColor="textSecondary" style={styles.afterLabel}>
                After this step
              </ThemedText>
              <DataTable
                tables={[{ name: step.resultVar ?? datasetName, table: after }]}
                maxRows={MAX_TABLE_ROWS}
              />
              {delta && (
                <ThemedText type="smallBold" style={{ color: theme.success }}>
                  {delta}
                </ThemedText>
              )}
            </>
          )}

          <Pressable
            onPress={() => onContinue(isCorrect)}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: theme.action },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.continueButtonText}>
              Continue
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}
    </ThemedView>
  );
}

function FillBlankInteraction({ step, options, selected, onSelect, theme }) {
  const displayCode = selected
    ? step.starterCode.replace(BLANK_MARKER, selected)
    : step.starterCode;

  return (
    <>
      <CodeBlock code={displayCode} />
      {!selected && (
        <View style={styles.bank}>
          {options.map((token) => (
            <Pressable
              key={token}
              onPress={() => onSelect(token)}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="code">{token}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

function ChoiceInteraction({ step, options, selected, onSelect, theme }) {
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const showAsCorrect = selected && option === step.answer;
        const showAsWrong = selected === option && option !== step.answer;
        return (
          <Pressable
            key={option}
            disabled={!!selected}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor: showAsCorrect
                  ? theme.success
                  : showAsWrong
                    ? theme.danger
                    : theme.backgroundSelected,
              },
              pressed && !selected && styles.pressed,
            ]}>
            <CodeBlock code={option} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
  },
  prompt: {
    fontSize: 18,
    lineHeight: 26,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  choices: {
    gap: Spacing.three,
  },
  option: {
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  outcome: {
    gap: Spacing.three,
  },
  afterLabel: {
    marginTop: Spacing.one,
  },
  continueButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  continueButtonText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.7,
  },
});
