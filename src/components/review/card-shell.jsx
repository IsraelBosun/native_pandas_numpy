import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { DataTable } from './data-table';

import { ChartView } from '@/components/chart-view';
import { ScalePressable, triggerHaptic } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chartPosition } from '@/lib/chart';

// Star + note only render when a session wires them up (recordReview-backed
// Review; not cram/Practice, which never touches persisted card_state).
export function CardShell({ prompt, dataset, chart, favorite, onToggleFavorite, note, onNoteChange, onNoteFocus, children }) {
  const theme = useTheme();
  const [noteOpen, setNoteOpen] = useState(!!note);
  const [draftNote, setDraftNote] = useState(note ?? '');

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText type="label" themeColor="textSecondary">
          Task
        </ThemedText>
        {(onNoteChange || onToggleFavorite) && (
          <View style={styles.headerActions}>
            {onNoteChange && (
              <ScalePressable
                hitSlop={8}
                scaleTo={0.85}
                onPress={() => {
                  setNoteOpen((prev) => !prev);
                  triggerHaptic('light');
                }}>
                <Feather
                  name="edit-3"
                  size={18}
                  color={noteOpen || note ? theme.action : theme.textSecondary}
                />
              </ScalePressable>
            )}
            {onToggleFavorite && (
              <ScalePressable hitSlop={8} scaleTo={0.85} onPress={onToggleFavorite} haptic="light">
                <Ionicons
                  name={favorite ? 'star' : 'star-outline'}
                  size={20}
                  color={favorite ? theme.warning : theme.textSecondary}
                />
              </ScalePressable>
            )}
          </View>
        )}
      </View>
      <ThemedText style={styles.prompt}>{prompt}</ThemedText>
      <DataTable dataset={dataset} />
      {/* Only "read this chart" cards show their chart up front; a result
          chart would otherwise hand over the answer before the recall. */}
      {chart && chartPosition(chart) === 'prompt' && <ChartView chart={chart} />}

      {noteOpen && onNoteChange && (
        <TextInput
          value={draftNote}
          onChangeText={setDraftNote}
          onFocus={onNoteFocus}
          onBlur={() => onNoteChange(draftNote)}
          placeholder="Add a note for yourself…"
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[
            styles.noteInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSelected },
          ]}
        />
      )}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  prompt: {
    fontSize: 16,
    lineHeight: 24,
  },
  noteInput: {
    minHeight: 44,
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
