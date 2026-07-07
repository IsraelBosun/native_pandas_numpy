import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { StreakPill } from '@/components/streak-pill';
import { ThemedText } from '@/components/themed-text';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function GreetingHeader({ streak }) {
  return (
    <Animated.View style={styles.row} entering={FadeInDown.duration(300)}>
      <View>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {greeting()}
        </ThemedText>
        <ThemedText type="title" style={styles.headline}>
          Ready to drill?
        </ThemedText>
      </View>
      <StreakPill days={streak} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
