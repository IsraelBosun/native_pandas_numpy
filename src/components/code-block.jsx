import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { useSyntaxColors } from '@/hooks/use-syntax-colors';
import { tokenize } from '@/lib/highlight';

export function CodeBlock({ code }) {
  const colors = useSyntaxColors();
  const lines = code.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, lineIndex) => (
        <ThemedText key={lineIndex} type="code" style={styles.line}>
          {tokenize(line).map((token, tokenIndex) => (
            <ThemedText
              key={tokenIndex}
              type="code"
              style={{ color: colors[token.kind] ?? colors.identifier }}>
              {token.text}
            </ThemedText>
          ))}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  line: {
    flexWrap: 'wrap',
  },
});
