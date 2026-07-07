import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AnswerInput } from './answer-input';
import { CardShell } from './card-shell';
import { FillBlankBody } from './fill-blank-body';
import { MultipleChoiceBody } from './multiple-choice-body';

import { CodeBlock } from '@/components/code-block';
import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ReviewCard({ card, revealed, onReveal, onGrade, onInputFocus }) {
  return (
    <CardShell prompt={card.prompt} dataset={card.dataset}>
      {card.type === 'fill-blank' ? (
        <FillBlankBody card={card} onReveal={onReveal} />
      ) : card.type === 'multiple-choice' ? (
        <MultipleChoiceBody card={card} onGrade={onGrade} />
      ) : (
        <FlashcardBody card={card} revealed={revealed} onReveal={onReveal} onInputFocus={onInputFocus} />
      )}
    </CardShell>
  );
}

function FlashcardBody({ card, revealed, onReveal, onInputFocus }) {
  const theme = useTheme();
  const [guess, setGuess] = useState('');

  if (!revealed) {
    return (
      <>
        <ThemedText type="label" themeColor="textSecondary">
          Try it (optional)
        </ThemedText>
        <AnswerInput value={guess} onChangeText={setGuess} onFocus={onInputFocus} />
        <ScalePressable onPress={onReveal} haptic="light" scaleTo={0.97}>
          <View style={[styles.revealButton, { backgroundColor: theme.action }]}>
            <ThemedText type="smallBold" style={styles.revealButtonText}>
              Show answer
            </ThemedText>
          </View>
        </ScalePressable>
      </>
    );
  }

  return (
    <Animated.View style={styles.answer} entering={FadeInDown.duration(250)}>
      <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
      {guess.trim() ? (
        <>
          <ThemedText type="label" themeColor="textSecondary">
            Your answer
          </ThemedText>
          <CodeBlock code={guess} />
        </>
      ) : null}
      <ThemedText type="label" themeColor="textSecondary">
        Answer
      </ThemedText>
      <CodeBlock code={card.answer} />
      <ThemedText themeColor="textSecondary">{card.why}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
  },
  answer: {
    gap: Spacing.three,
  },
  revealButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  revealButtonText: {
    color: '#FFFFFF',
  },
});
