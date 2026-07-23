import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';

import { CodeBlock } from '@/components/code-block';
import { ScalePressable, triggerHaptic } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildOptions } from '@/lib/race/quiz-pool';
import { playSound } from '@/lib/sound';

// Visually mirrors components/review/multiple-choice-body.jsx (auto-check on
// tap, success/danger border on reveal) but the result only ever feeds
// onAnswer(isCorrect) into the race's speed/coin effects — never onGrade,
// never the real SM-2 schedule. Race quiz answers are ungraded practice.
export function QuizOverlay({ card, onAnswer }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(null);
  const options = useMemo(() => buildOptions(card), [card]);
  const isCorrect = selected === card.answer;

  function handleSelect(option) {
    if (selected) return;
    const correct = option === card.answer;
    triggerHaptic(correct ? 'success' : 'error');
    playSound(correct ? 'correct' : 'wrong');
    setSelected(option);
  }

  return (
    <Animated.View style={styles.scrim} entering={FadeIn.duration(200)}>
      <Animated.View entering={SlideInDown.duration(300).springify().damping(16)} style={styles.cardWrap}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="label" themeColor="textSecondary">
            Pop quiz
          </ThemedText>
          <ThemedText type="subtitle" style={styles.prompt}>
            {card.prompt}
          </ThemedText>

          {options.map((option) => {
            const showAsCorrect = selected && option === card.answer;
            const showAsWrong = selected === option && option !== card.answer;
            return (
              <Pressable
                key={option}
                disabled={!!selected}
                onPress={() => handleSelect(option)}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: showAsCorrect ? theme.success : showAsWrong ? theme.danger : theme.border },
                  pressed && !selected && styles.pressed,
                ]}>
                <CodeBlock code={option} />
              </Pressable>
            );
          })}

          {selected && (
            <Animated.View style={styles.feedback} entering={FadeInDown.duration(220)}>
              <ThemedText type="smallBold" style={{ color: isCorrect ? theme.success : theme.danger }}>
                {isCorrect ? 'Correct, nitro boost!' : 'Not quite, slowing down'}
              </ThemedText>
              <ScalePressable onPress={() => onAnswer(isCorrect)} haptic="light" scaleTo={0.97}>
                <View style={[styles.continueButton, { backgroundColor: theme.action }]}>
                  <ThemedText type="smallBold" style={styles.continueButtonText}>
                    Back to the race
                  </ThemedText>
                </View>
              </ScalePressable>
            </Animated.View>
          )}
        </ThemedView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  cardWrap: {
    width: '100%',
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  prompt: {
    fontSize: 20,
    lineHeight: 26,
  },
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
  },
  continueButtonText: {
    color: '#FFFFFF',
  },
});
