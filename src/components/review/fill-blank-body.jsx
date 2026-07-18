import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CodeBlock } from '@/components/code-block';
import { ScalePressable, triggerHaptic } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { seededShuffle } from '@/lib/shuffle';
import { playSound } from '@/lib/sound';

const BLANK_MARKER = '___';
const SNAP_SPRING = { damping: 14, stiffness: 300, mass: 0.5 };

// Content authors mark each blank in `starterCode` with `___`, in the order
// they should resolve. Single-blank cards keep the original flat shape
// (tokens: [correct], distractors: [wrong, wrong, ...]); multi-blank cards
// use one entry per blank (tokens: [c1, c2], distractors: [[w,w],[w,w]]).
// Blanks resolve strictly left-to-right — tapping the right chip locks that
// blank and advances to the next one, so a multi-blank card plays like a
// short chained puzzle rather than one flat multi-select.
function buildDisplayCode(starterCode, filled) {
  let i = 0;
  return starterCode.replace(new RegExp(BLANK_MARKER, 'g'), () => {
    const token = filled[i];
    i += 1;
    return token ?? BLANK_MARKER;
  });
}

export function FillBlankBody({ card, onReveal }) {
  const theme = useTheme();
  const isMultiBlank = Array.isArray(card.distractors[0]);
  const blankTokens = card.tokens;
  const blankDistractors = isMultiBlank ? card.distractors : [card.distractors];

  const [filled, setFilled] = useState(() => Array(blankTokens.length).fill(null));
  const [mistakes, setMistakes] = useState(0);
  const activeIndex = filled.findIndex((f) => f === null);
  const complete = activeIndex === -1;

  const pulse = useSharedValue(1);
  const codeStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const shakeX = useSharedValue(0);
  const trayStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const correctToken = complete ? null : blankTokens[activeIndex];
  const options = useMemo(() => {
    if (complete) return [];
    return seededShuffle([correctToken, ...blankDistractors[activeIndex]], `${card.id}-${activeIndex}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, activeIndex, complete]);

  const displayCode = buildDisplayCode(card.starterCode, filled);

  function handlePress(token) {
    if (token === correctToken) {
      triggerHaptic('success');
      playSound('correct');
      pulse.value = withSequence(withTiming(1.035, { duration: 80 }), withSpring(1, SNAP_SPRING));

      const nextFilled = [...filled];
      nextFilled[activeIndex] = token;
      setFilled(nextFilled);

      if (nextFilled.every(Boolean)) {
        // Clean chain suggests Good; any slip caps the suggestion at Hard —
        // eventually getting it right shouldn't read as an Easy recall.
        onReveal(mistakes > 0 ? 3 : 4);
      }
    } else {
      triggerHaptic('error');
      playSound('wrong');
      shakeX.value = withSequence(
        withTiming(-8, { duration: 45 }),
        withTiming(8, { duration: 45 }),
        withTiming(-6, { duration: 45 }),
        withTiming(0, { duration: 45 })
      );
      setMistakes((m) => m + 1);
    }
  }

  return (
    <>
      <Animated.View style={codeStyle}>
        <CodeBlock code={displayCode} copyable={complete} />
      </Animated.View>
      {!complete ? (
        <Animated.View style={[styles.bank, trayStyle]}>
          {options.map((token) => (
            <ScalePressable key={token} scaleTo={0.94} onPress={() => handlePress(token)}>
              {/* Chips sit on the backgroundElement card, so they step up to
                  backgroundSelected for contrast. */}
              <View style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="code">{token}</ThemedText>
              </View>
            </ScalePressable>
          ))}
        </Animated.View>
      ) : (
        <Animated.View style={styles.feedback} entering={FadeInDown.duration(250)}>
          <ThemedText type="smallBold" style={{ color: mistakes > 0 ? theme.warning : theme.success }}>
            {mistakes > 0 ? `Filled it — ${mistakes} slip${mistakes > 1 ? 's' : ''} along the way` : 'Correct'}
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
