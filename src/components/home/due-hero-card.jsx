import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, fontFamilyForWeight } from '@/constants/theme';
import { useGradient } from '@/hooks/use-theme';

export function DueHeroCard({ count, onStartReview }) {
  const gradient = useGradient('hero');
  const allDone = count === 0;

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(320)}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>
        <ThemedText type="label" style={styles.label}>
          Due today
        </ThemedText>
        <View style={styles.countRow}>
          <ThemedText style={styles.count}>{count}</ThemedText>
          <ThemedText style={styles.countUnit}>{count === 1 ? 'card' : 'cards'}</ThemedText>
        </View>
        {allDone ? (
          <View style={styles.doneRow}>
            <Feather name="check-circle" size={18} color="#FFFFFF" />
            <ThemedText type="smallBold" style={styles.doneText}>
              All caught up — come back tomorrow
            </ThemedText>
          </View>
        ) : (
          <ScalePressable onPress={onStartReview} haptic="light" scaleTo={0.97}>
            <View style={styles.button}>
              <Feather name="play" size={18} color={gradient[0]} />
              <ThemedText type="smallBold" style={{ color: gradient[0] }}>
                Start review
              </ThemedText>
            </View>
          </ScalePressable>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  label: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  count: {
    color: '#FFFFFF',
    fontFamily: fontFamilyForWeight(700),
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
  },
  countUnit: {
    color: '#FFFFFF',
    fontFamily: fontFamilyForWeight(600),
    fontSize: 18,
    opacity: 0.9,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  doneText: {
    color: '#FFFFFF',
  },
});
