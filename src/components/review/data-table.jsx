import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getFixture } from '@/lib/fixtures';

const MAX_VISIBLE_ROWS = 5;
const ROW_HEIGHT = 34;

// Fixed-ish per-column widths (monospace, ~7.5px/char at fontSize 13) so header
// and body cells line up while scrolling horizontally together.
function columnWidth(label, cells) {
  const longest = Math.max(String(label).length, ...cells.map((v) => String(v).length));
  return Math.max(56, Math.round(longest * 7.5) + Spacing.three);
}

function Cell({ value, width, isHeader, theme }) {
  const isMissing = value === null || value === undefined;
  const isNumeric = typeof value === 'number';
  const text = isMissing ? 'NaN' : String(value);

  return (
    <View style={[styles.cell, { width }]}>
      <ThemedText
        type={isHeader ? 'smallBold' : 'code'}
        themeColor={isHeader ? 'textSecondary' : isMissing ? 'warning' : 'text'}
        style={[
          styles.cellText,
          isNumeric && !isHeader && styles.cellTextNumeric,
          isMissing && styles.cellTextMissing,
        ]}
        numberOfLines={1}>
        {text}
      </ThemedText>
    </View>
  );
}

function Table({ name, table, theme, maxRows = MAX_VISIBLE_ROWS }) {
  const { columns, rows: allRows } = table.kind === 'array'
    ? { columns: table.values.map((_, i) => String(i)), rows: [table.values] }
    : table;
  const rows = allRows.slice(0, maxRows);
  const clippedCount = allRows.length - rows.length;

  const widths = columns.map((col, i) => columnWidth(col, rows.map((r) => r[i])));

  return (
    <View style={styles.tableBlock}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="code" themeColor="textSecondary">
          {name}
        </ThemedText>
      </View>
      <View style={[styles.tableContainer, { borderColor: theme.backgroundSelected }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={[styles.row, styles.headerRow, { borderColor: theme.backgroundSelected }]}>
              {columns.map((col, i) => (
                <Cell key={i} value={col} width={widths[i]} isHeader theme={theme} />
              ))}
            </View>
            {rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={[
                  styles.row,
                  rowIndex % 2 === 1 && { backgroundColor: theme.backgroundSelected },
                ]}>
                {row.map((value, i) => (
                  <Cell key={i} value={value} width={widths[i]} theme={theme} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      {clippedCount > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          + {clippedCount} more rows
        </ThemedText>
      )}
    </View>
  );
}

// Renders either named fixtures (`dataset`, the deck-card path) or table
// objects passed directly (`tables: [{ name, table }]`, the challenge path,
// where snapshots live in the challenge JSON instead of lib/fixtures.js).
export function DataTable({ dataset, tables: providedTables, maxRows }) {
  const theme = useTheme();

  let tables;
  if (providedTables) {
    tables = providedTables.filter(({ table }) => table).map(({ name, table }) => [name, table]);
  } else {
    if (!dataset) return null;
    const names = Array.isArray(dataset) ? dataset : [dataset];
    tables = names.map((name) => [name, getFixture(name)]).filter(([, table]) => table);
  }
  if (tables.length === 0) return null;

  return (
    <View style={styles.container}>
      {tables.map(([name, table]) => (
        <Table key={name} name={name} table={table} theme={theme} maxRows={maxRows} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  tableBlock: {
    gap: Spacing.one,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    alignItems: 'center',
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  cell: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  cellText: {
    fontSize: 13,
  },
  cellTextNumeric: {
    textAlign: 'right',
  },
  cellTextMissing: {
    fontStyle: 'italic',
  },
});
