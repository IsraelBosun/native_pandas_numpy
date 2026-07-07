import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useSyntaxColors } from '@/hooks/use-syntax-colors';
import { useTheme } from '@/hooks/use-theme';
import { tokenize } from '@/lib/highlight';

// Self-pairing (quotes) and open/close pairs this input auto-closes, mirrors,
// and lets you "type through" instead of duplicating.
const OPENERS = { '(': ')', '[': ']', '{': '}', "'": "'", '"': '"' };
const CLOSERS = new Set([')', ']', '}']);
const QUOTES = new Set(["'", '"']);

export function AnswerInput({ value, onChangeText, onFocus }) {
  const theme = useTheme();
  const colors = useSyntaxColors();
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const selectionRef = useRef(selection);

  function updateSelection(next) {
    selectionRef.current = next;
    setSelection(next);
  }

  // Bracket/quote matching is done by diffing prevText/nextText against the
  // caret position we already had, rather than intercepting raw key events —
  // RN's onKeyPress can't reliably preventDefault the native TextInput mutation.
  function handleChangeText(nextText) {
    const prevText = value;
    const prevSelection = selectionRef.current;
    const hadSelection = prevSelection.end > prevSelection.start;
    const insertPos = prevSelection.start;
    const grew = nextText.length - prevText.length;

    if (grew === 1) {
      const typed = nextText[insertPos];

      // Typing a closer/quote that's already sitting right where we'd insert
      // one (almost always the pair we just auto-inserted) — skip over it.
      if (!hadSelection && (CLOSERS.has(typed) || QUOTES.has(typed)) && prevText[insertPos] === typed) {
        onChangeText(prevText);
        updateSelection({ start: insertPos + 1, end: insertPos + 1 });
        return;
      }

      if (OPENERS[typed]) {
        const closer = OPENERS[typed];
        const wrapped = hadSelection ? prevText.slice(prevSelection.start, prevSelection.end) : '';
        const tail = nextText.slice(insertPos + 1);
        const finalText = nextText.slice(0, insertPos + 1) + wrapped + closer + tail;
        onChangeText(finalText);
        updateSelection(
          hadSelection
            ? { start: insertPos + 1, end: insertPos + 1 + wrapped.length }
            : { start: insertPos + 1, end: insertPos + 1 }
        );
        return;
      }
    }

    // Backspacing an empty auto-inserted pair, e.g. "(|)" -> "", removes both.
    if (grew === -1 && !hadSelection) {
      const delPos = insertPos - 1;
      const removed = prevText[delPos];
      const after = prevText[delPos + 1];
      if (delPos >= 0 && OPENERS[removed] === after) {
        const finalText = nextText.slice(0, delPos) + nextText.slice(delPos + 1);
        onChangeText(finalText);
        updateSelection({ start: delPos, end: delPos });
        return;
      }
    }

    onChangeText(nextText);
  }

  const tokens = tokenize(value);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
      <Text style={styles.overlay}>
        {value.length === 0 ? (
          <Text style={[styles.overlayText, { color: theme.textSecondary }]}>Type your answer…</Text>
        ) : (
          tokens.map((token, i) => (
            <Text key={i} style={[styles.overlayText, { color: colors[token.kind] ?? colors.identifier }]}>
              {token.text}
            </Text>
          ))
        )}
      </Text>
      <TextInput
        style={[styles.input, styles.overlayText, { color: 'transparent' }]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={onFocus}
        selection={selection}
        onSelectionChange={(e) => updateSelection(e.nativeEvent.selection)}
        multiline
        blurOnSubmit={false}
        returnKeyType="default"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        cursorColor={theme.action}
        selectionColor={theme.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  overlay: {
    width: '100%',
    padding: Spacing.two,
  },
  overlayText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.two,
    textAlignVertical: 'top',
  },
});
