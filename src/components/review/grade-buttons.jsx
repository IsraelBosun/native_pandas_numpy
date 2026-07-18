import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { previewCardIntervals } from '@/lib/cards';

const GRADE_META = [
  { grade: 2, label: 'Again', colorKey: 'danger' },
  { grade: 3, label: 'Hard', colorKey: 'warning' },
  { grade: 4, label: 'Good', colorKey: 'action' },
  { grade: 5, label: 'Easy', colorKey: 'success' },
];

// Again always requeues near-immediately within the current session — the
// persisted 1-day interval is only a fallback due date if the session ends
// before the card is revisited, so its button never reads the real interval.
// Do not "simplify" this to read straight off previews[2].interval.
function formatInterval(grade, interval) {
  if (grade === 2) return '<1 min';
  return interval === 1 ? '1 day' : `${interval} days`;
}

// suggestedGrade comes from auto-checked card types (fill-blank chains,
// multiple-choice) — it pre-highlights the grade that matches how cleanly
// the user actually answered, so confirming is a single tap, but every
// button stays pressable since the user has final say.
export function GradeButtons({ card, onGrade, suggestedGrade }) {
  const theme = useTheme();
  const previews = useMemo(() => previewCardIntervals(card), [card.id]);

  return (
    <Animated.View style={styles.grid} entering={FadeInUp.duration(250)}>
      {GRADE_META.map(({ grade, label, colorKey }) => {
        const isSuggested = grade === suggestedGrade;
        return (
          <ScalePressable
            key={grade}
            haptic="light"
            scaleTo={0.94}
            onPress={() => onGrade(grade)}
            style={styles.buttonWrap}>
            <View
              style={[
                styles.button,
                {
                  borderColor: theme[colorKey],
                  backgroundColor: isSuggested ? theme[colorKey] : theme.backgroundElement,
                },
              ]}>
              <ThemedText type="smallBold" style={{ color: isSuggested ? '#FFFFFF' : theme[colorKey] }}>
                {label}
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: isSuggested ? '#FFFFFF' : theme.textSecondary }}>
                {formatInterval(grade, previews[grade].interval)}
              </ThemedText>
            </View>
          </ScalePressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  buttonWrap: {
    width: '47%',
    flexGrow: 1,
  },
  button: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: Spacing.half,
  },
});
