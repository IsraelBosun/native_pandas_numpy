import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { playSound } from '@/lib/sound';

// Every 5th consecutive correct grade gets a bigger pop + a chime, not just
// the usual tick — mirrors the milestone feel of the streak flame.
const MILESTONE_STEP = 5;
// A combo of 1 is just "you got one right" — it only reads as a streak once
// there's a second in a row, so the pill stays hidden until then.
const MIN_VISIBLE_COMBO = 2;

export function ComboPill({ combo }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const prevCombo = useRef(combo);

  useEffect(() => {
    if (combo > prevCombo.current && combo >= MIN_VISIBLE_COMBO) {
      const milestone = combo % MILESTONE_STEP === 0;
      if (milestone) playSound('combo');
      scale.value = withSequence(
        withSpring(milestone ? 1.35 : 1.18, { damping: 12, stiffness: 320, mass: 0.6 }),
        withSpring(1, { damping: 16, stiffness: 280, mass: 0.6 })
      );
    }
    prevCombo.current = combo;
  }, [combo, scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (combo < MIN_VISIBLE_COMBO) return null;

  const milestone = combo % MILESTONE_STEP === 0;

  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={popStyle}>
      <ThemedView
        type="backgroundElement"
        style={[styles.pill, { borderColor: milestone ? theme.warning : theme.border }]}>
        <Ionicons name="flash" size={16} color={theme.warning} />
        <ThemedText type="smallBold" themeColor="text">
          {combo}x
        </ThemedText>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
