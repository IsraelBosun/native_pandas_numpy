import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const COL_WIDTH = 76;
const ROW_HEIGHT = 32;

// Small, self-contained table illustration for the onboarding demo cards —
// deliberately not wired to lib/fixtures.js (no real dataset backs it), since
// this is marketing copy, not a spaced-repetition card.
export function MiniTable({ columns, rows, highlight }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={[styles.row, styles.headerRow, { borderColor: theme.border }]}>
        {columns.map((col) => (
          <View key={col} style={styles.cell}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cellText}>
              {col}
            </ThemedText>
          </View>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((value, colIndex) => {
            const isHighlighted = highlight && highlight.row === rowIndex && highlight.col === colIndex;
            return (
              <View key={colIndex} style={styles.cell}>
                <View
                  style={[
                    styles.cellValueWrap,
                    isHighlighted && { backgroundColor: theme.dangerMuted },
                  ]}>
                  <ThemedText
                    type="code"
                    themeColor={isHighlighted ? 'danger' : colIndex === 0 ? 'textSecondary' : 'text'}
                    style={styles.cellText}>
                    {value}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  cell: {
    width: COL_WIDTH,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  cellValueWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.sm,
  },
  cellText: {
    fontSize: 13,
  },
});
