import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressBar } from './progress-bar';
import { ScalePressable } from './scale-pressable';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useTopicHues } from '@/hooks/use-theme';

// Below this, a topic reads as "still weak" (orange); at or above, "mastered" (green).
const MASTERY_THRESHOLD = 50;

// Stagger cap: past this index tiles enter together, so a long grid never
// makes the user wait for the tail end of the cascade.
const MAX_STAGGER_INDEX = 9;

export function TopicTile({ label, mastery, hue, icon, index = 0, onPress }) {
  const theme = useTheme();
  const hues = useTopicHues();
  const identity = hues[hue] ?? hues.blue;
  // Identity comes from the hue chip; mastery keeps the semantic color.
  const masteryColor = mastery >= MASTERY_THRESHOLD ? theme.success : theme.warning;

  return (
    <Animated.View
      style={styles.wrap}
      entering={FadeInDown.delay(Math.min(index, MAX_STAGGER_INDEX) * 45).duration(320)}>
      <ScalePressable onPress={onPress} scaleTo={0.96}>
        <ThemedView type="backgroundElement" style={[styles.tile, { borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={[styles.iconChip, { backgroundColor: identity.surface }]}>
              <Feather name={icon ?? 'book'} size={17} color={identity.fg} />
            </View>
            <ThemedText type="smallBold" style={{ color: masteryColor }}>
              {mastery}%
            </ThemedText>
          </View>
          <ThemedText numberOfLines={1}>{label}</ThemedText>
          <ProgressBar progress={mastery / 100} color={masteryColor} />
        </ThemedView>
      </ScalePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '47%',
    flexGrow: 1,
  },
  tile: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
