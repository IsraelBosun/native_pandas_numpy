import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SQUARE_SIZE = 12;

export function HeatmapGrid({ data }) {
  const theme = useTheme();
  const weeks = chunkIntoWeeks(data);
  const maxCount = Math.max(1, ...data.map((day) => day.count));

  return (
    <View style={styles.row}>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.column}>
          {week.map((day) => (
            <View key={day.date} style={[styles.square, squareStyle(theme, day.count, maxCount)]} />
          ))}
        </View>
      ))}
    </View>
  );
}

function chunkIntoWeeks(data) {
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  return weeks;
}

function squareStyle(theme, count, maxCount) {
  if (count === 0) return { backgroundColor: theme.backgroundElement };
  const ratio = count / maxCount;
  return { backgroundColor: theme.action, opacity: 0.35 + ratio * 0.65 };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.half,
  },
  column: {
    gap: Spacing.half,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 3,
  },
});
