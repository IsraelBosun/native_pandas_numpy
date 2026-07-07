import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useTopicHues } from '@/hooks/use-theme';

export function WeakTopicRow({ label, hue, icon, avgEf }) {
  const theme = useTheme();
  const hues = useTopicHues();
  const identity = hues[hue] ?? hues.blue;

  return (
    <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.left}>
        <View style={[styles.iconChip, { backgroundColor: identity.surface }]}>
          <Feather name={icon ?? 'book'} size={15} color={identity.fg} />
        </View>
        <ThemedText>{label}</ThemedText>
      </View>
      <View style={[styles.badge, { borderColor: theme.warning }]}>
        <ThemedText type="smallBold" style={{ color: theme.warning }}>
          {avgEf.toFixed(2)} ease
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
});
