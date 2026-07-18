import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const GAP = Spacing.half;
const FALLBACK_SQUARE_SIZE = 12;

export function HeatmapGrid({ data }) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const weeks = chunkIntoWeeks(data);
  const maxCount = Math.max(1, ...data.map((day) => day.count));

  // Squares stretch to fill the full row width — size derives from however
  // much horizontal space the parent actually gives us, not a fixed pixel
  // value, so the grid always spans edge to edge like a GitHub contribution graph.
  const squareSize = containerWidth
    ? Math.floor((containerWidth - GAP * (weeks.length - 1)) / weeks.length)
    : FALLBACK_SQUARE_SIZE;

  return (
    <View style={styles.row} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.column}>
          {week.map((day) => (
            <View
              key={day.date}
              style={[
                { width: squareSize, height: squareSize, borderRadius: 3 },
                squareStyle(theme, day.count, maxCount),
              ]}
            />
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
    width: '100%',
  },
  column: {
    gap: Spacing.half,
  },
});
