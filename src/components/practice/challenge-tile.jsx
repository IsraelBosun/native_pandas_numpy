import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useTopicHues } from '@/hooks/use-theme';

export function ChallengeTile({ title, subtitle, difficulty, minutes, stepCount, completed, onPress }) {
  const theme = useTheme();
  const hues = useTopicHues();
  // Completed flips the chip to the green identity — a small trophy moment.
  const identity = completed ? hues.green : hues.violet;

  return (
    <ScalePressable onPress={onPress} scaleTo={0.97}>
      <ThemedView type="backgroundElement" style={[styles.tile, { borderColor: theme.border }]}>
        <View style={[styles.iconChip, { backgroundColor: identity.surface }]}>
          <Feather name={completed ? 'award' : 'terminal'} size={18} color={identity.fg} />
        </View>
        <View style={styles.body}>
          <ThemedText>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
            {difficulty} · ~{minutes} min · {stepCount} steps
          </ThemedText>
        </View>
        <Feather
          name={completed ? 'check-circle' : 'chevron-right'}
          size={20}
          color={completed ? theme.success : theme.textSecondary}
        />
      </ThemedView>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  meta: {
    marginTop: Spacing.one,
  },
});
