import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ChartView } from '@/components/chart-view';
import { CodeBlock } from '@/components/code-block';
import { ScalePressable, triggerHaptic } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chartPosition } from '@/lib/chart';
import { seededShuffle } from '@/lib/shuffle';

// Multiple-choice grades itself the instant an option is picked (correct=4,
// wrong=2, per CLAUDE.md §7) — there's no separate GradeButtons step for this
// card type, "Continue" just advances after the auto-grade already happened.
export function MultipleChoiceBody({ card, onGrade }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(null);
  const options = useMemo(
    () => seededShuffle([card.answer, ...card.distractors], card.id),
    [card.id, card.answer, card.distractors]
  );
  const isCorrect = selected === card.answer;

  return (
    <>
      {options.map((option) => {
        const showAsCorrect = selected && option === card.answer;
        const showAsWrong = selected === option && option !== card.answer;
        return (
          <Pressable
            key={option}
            disabled={!!selected}
            onPress={() => {
              // Auto-checked answer — success/error haptic mirrors the check.
              triggerHaptic(option === card.answer ? 'success' : 'error');
              setSelected(option);
            }}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor: showAsCorrect
                  ? theme.success
                  : showAsWrong
                    ? theme.danger
                    : theme.border,
              },
              pressed && !selected && styles.pressed,
            ]}>
            <CodeBlock code={option} copyable={showAsCorrect} />
          </Pressable>
        );
      })}

      {selected && (
        <Animated.View style={styles.feedback} entering={FadeInDown.duration(250)}>
          <ThemedText type="smallBold" style={{ color: isCorrect ? theme.success : theme.danger }}>
            {isCorrect ? 'Correct' : 'Not quite'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{card.why}</ThemedText>
          {card.chart && chartPosition(card.chart) === 'answer' && <ChartView chart={card.chart} />}
          <ScalePressable onPress={() => onGrade(isCorrect ? 4 : 2)} haptic="light" scaleTo={0.97}>
            <View style={[styles.continueButton, { backgroundColor: theme.action }]}>
              <ThemedText type="smallBold" style={styles.continueButtonText}>
                Continue
              </ThemedText>
            </View>
          </ScalePressable>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  option: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  feedback: {
    gap: Spacing.three,
  },
  continueButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  continueButtonText: {
    color: '#FFFFFF',
  },
});
