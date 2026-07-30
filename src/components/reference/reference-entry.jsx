import { Pressable, StyleSheet, View } from 'react-native';

import { ChartView } from '@/components/chart-view';
import { CodeBlock } from '@/components/code-block';
import { ThemedText } from '@/components/themed-text';
import { Collapsible } from '@/components/ui/collapsible';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ReferenceEntry({ entry, onMethodPress }) {
  return (
    <Collapsible title={entry.title}>
      <View style={styles.body}>
        <Field label="Purpose" text={entry.purpose} />

        <View style={styles.field}>
          <ThemedText type="label" themeColor="textSecondary">
            Syntax
          </ThemedText>
          <CodeBlock code={entry.syntax} copyable />
        </View>

        {entry.example ? (
          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Example
            </ThemedText>
            <CodeBlock code={entry.example} copyable />
          </View>
        ) : null}

        {entry.chart ? (
          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Output
            </ThemedText>
            <ChartView chart={entry.chart} />
          </View>
        ) : null}

        <Field label="Common mistake" text={entry.commonMistake} />
        <Field label="Why" text={entry.why} />

        {entry.relatedMethods.length > 0 && (
          <View style={styles.chipsWrap}>
            {entry.relatedMethods.map((method) => (
              <MethodChip key={method} method={method} onPress={onMethodPress} />
            ))}
          </View>
        )}
      </View>
    </Collapsible>
  );
}

function Field({ label, text }) {
  if (!text) return null;
  return (
    <View style={styles.field}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{text}</ThemedText>
    </View>
  );
}

function MethodChip({ method, onPress }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onPress(method)}
      style={({ pressed }) => [styles.chip, { borderColor: theme.action }, pressed && styles.pressed]}>
      <ThemedText type="small" style={{ color: theme.action }}>
        {method}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.half,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
