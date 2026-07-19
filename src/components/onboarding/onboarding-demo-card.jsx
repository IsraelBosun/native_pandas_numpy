import { StyleSheet, View } from 'react-native';

import { CodeBlock } from '@/components/code-block';
import { MiniTable } from '@/components/onboarding/mini-table';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Illustration card for an onboarding slide: a leading code line, an optional
// mini result table, and an optional trailing query line — mirrors the shape
// of a real Review card's example without being wired to real dataset state.
export function OnboardingDemoCard({ headCode, table, tailCode }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <CodeBlock code={headCode} />
      {table && (
        <View style={styles.tableWrap}>
          <MiniTable columns={table.columns} rows={table.rows} highlight={table.highlight} />
        </View>
      )}
      {tailCode && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <CodeBlock code={tailCode} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
  },
  tableWrap: {
    paddingVertical: Spacing.one,
  },
  divider: {
    height: 1,
  },
});
