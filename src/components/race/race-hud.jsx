import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { STARTING_LIVES } from '@/lib/race/scoring';

export function RaceHud({ lives, coins, score, topicLabel, hue }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.livesRow}>
        {Array.from({ length: STARTING_LIVES }).map((_, i) => (
          <Feather key={i} name="heart" size={18} color={i < lives ? theme.danger : theme.border} />
        ))}
      </View>

      <View style={[styles.topicPill, { backgroundColor: hue.surface }]}>
        <ThemedText type="smallBold" style={{ color: hue.fg }}>
          {topicLabel}
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Feather name="dollar-sign" size={14} color={theme.warning} />
          <ThemedText type="smallBold">{coins}</ThemedText>
        </View>
        <View style={styles.statChip}>
          <Feather name="zap" size={14} color={theme.action} />
          <ThemedText type="smallBold">{score}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  livesRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  topicPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
