import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BAR_MAX_HEIGHT = 64;

export function RetentionBars({ data }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {data.map((day) => (
        <View key={day.date} style={styles.barWrap}>
          <View style={[styles.bar, barStyle(theme, day.retention)]} />
        </View>
      ))}
    </View>
  );
}

function barStyle(theme, retention) {
  if (retention === null) return { height: 2, backgroundColor: theme.backgroundElement };
  return {
    height: Math.max(4, (retention / 100) * BAR_MAX_HEIGHT),
    backgroundColor: retention >= 80 ? theme.success : retention >= 50 ? theme.warning : theme.danger,
  };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
    height: BAR_MAX_HEIGHT,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
  },
});
