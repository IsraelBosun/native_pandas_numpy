import { StyleSheet } from 'react-native';

import { DataTable } from './data-table';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CardShell({ prompt, dataset, children }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="label" themeColor="textSecondary">
        Task
      </ThemedText>
      <ThemedText style={styles.prompt}>{prompt}</ThemedText>
      <DataTable dataset={dataset} />
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.three,
  },
  prompt: {
    fontSize: 18,
    lineHeight: 26,
  },
});
