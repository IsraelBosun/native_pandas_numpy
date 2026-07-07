import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CodeBlock } from '@/components/code-block';
import { ScalePressable, triggerHaptic } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { seededShuffle } from '@/lib/shuffle';

// Content authors blank exactly one token out of `starterCode` with this
// marker — multi-blank fill-ins aren't used by any deck yet, so the UI only
// supports one.
const BLANK_MARKER = '___';

export function FillBlankBody({ card, onReveal }) {
  const theme = useTheme();
  const [selected, setSelected] = useState(null);
  const correctToken = card.tokens[0];
  const options = useMemo(
    () => seededShuffle([correctToken, ...card.distractors], card.id),
    [card.id, correctToken, card.distractors]
  );
  const isCorrect = selected === correctToken;
  const displayCode = selected ? card.starterCode.replace(BLANK_MARKER, selected) : card.starterCode;

  return (
    <>
      <CodeBlock code={displayCode} />
      {!selected ? (
        <View style={styles.bank}>
          {options.map((token) => (
            <ScalePressable
              key={token}
              scaleTo={0.94}
              onPress={() => {
                // Auto-checked answer, so the device gets to judge: success
                // buzz for a hit, error buzz for a miss.
                triggerHaptic(token === correctToken ? 'success' : 'error');
                setSelected(token);
                onReveal();
              }}>
              {/* Chips sit on the backgroundElement card, so they step up to
                  backgroundSelected for contrast. */}
              <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="code">{token}</ThemedText>
              </View>
            </ScalePressable>
          ))}
        </View>
      ) : (
        <Animated.View style={styles.feedback} entering={FadeInDown.duration(250)}>
          <ThemedText type="smallBold" style={{ color: isCorrect ? theme.success : theme.danger }}>
            {isCorrect ? 'Correct' : `Not quite — correct answer: ${correctToken}`}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{card.why}</ThemedText>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  feedback: {
    gap: Spacing.three,
  },
});
