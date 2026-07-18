import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { triggerHaptic } from '@/components/scale-pressable';
import { useSyntaxColors } from '@/hooks/use-syntax-colors';
import { useTheme } from '@/hooks/use-theme';
import { tokenize } from '@/lib/highlight';

const COPIED_RESET_MS = 1500;

export function CodeBlock({ code, copyable = false }) {
  const colors = useSyntaxColors();
  const theme = useTheme();
  const lines = code.split('\n');
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    triggerHaptic('light');
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  const body = (
    <View style={[styles.container, copyable && styles.containerCopyable]}>
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

  if (!copyable) return body;

  return (
    <Pressable onLongPress={handleCopy} delayLongPress={350} style={styles.copyableWrapper}>
      {body}
      <View
        pointerEvents="none"
        style={[styles.copyBadge, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
        <Feather name={copied ? 'check' : 'copy'} size={11} color={copied ? theme.success : theme.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  containerCopyable: {
    paddingRight: 26,
  },
  line: {
    flexWrap: 'wrap',
  },
  copyableWrapper: {
    position: 'relative',
  },
  copyBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
