import { StyleSheet, View } from 'react-native';

import { ChartView } from '@/components/chart-view';
import { CodeBlock } from '@/components/code-block';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function LessonStep({ step }) {
  if (step.type === 'example') {
    return (
      <View style={styles.container}>
        <ThemedText type="subtitle" style={styles.heading}>
          {step.heading}
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.exampleCard}>
          <CodeBlock code={step.code} copyable />
          {step.output ? (
            <ThemedText type="code" themeColor="textSecondary">
              {step.output}
            </ThemedText>
          ) : null}
          {/* A plotting example's output is the chart, not printed text. */}
          {step.chart ? <ChartView chart={step.chart} /> : null}
        </ThemedView>
        {step.caption ? <ThemedText themeColor="textSecondary">{step.caption}</ThemedText> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.heading}>
        {step.heading}
      </ThemedText>
      <ThemedText>{step.body}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
  },
  exampleCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
