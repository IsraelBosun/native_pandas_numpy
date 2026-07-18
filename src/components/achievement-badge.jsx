import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useTopicHues } from '@/hooks/use-theme';

export function AchievementBadge({ achievement, locked = false }) {
  const theme = useTheme();
  const hues = useTopicHues();
  const identity = hues[achievement.hue] ?? hues.blue;

  return (
    <View style={[styles.badge, { borderColor: theme.border }]}>
      <View style={[styles.iconChip, { backgroundColor: locked ? theme.backgroundSelected : identity.surface }]}>
        <Feather
          name={locked ? 'lock' : achievement.icon}
          size={18}
          color={locked ? theme.textSecondary : identity.fg}
        />
      </View>
      <ThemedText
        type="smallBold"
        numberOfLines={2}
        style={[styles.title, locked && { color: theme.textSecondary }]}>
        {achievement.title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 92,
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
  },
});
