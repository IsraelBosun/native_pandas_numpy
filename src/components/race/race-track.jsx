import { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Coin } from './coin';
import { LaneInput } from './lane-input';
import { Obstacle } from './obstacle';
import { PlayerCar } from './player-car';

import { useTheme } from '@/hooks/use-theme';
import { LANE_COUNT } from '@/lib/race/lanes';

const DASH_UNIT = 40;
const DASH_HEIGHT = 20;
const DASH_WIDTH = 4;
const DASH_SCROLL_MS = 500;

// The scrolling-road illusion: no canvas, just two dashed divider columns
// whose dash pattern tiles exactly every DASH_UNIT px, looped with a linear
// withRepeat from 0 to DASH_UNIT — at the loop point the pattern is pixel-
// identical to its start, so the reset is invisible.
export function RaceTrack({
  engine,
  obstacles,
  coins,
  onSwipe,
  onLayoutSize,
  trackWidth,
  trackHeight,
  onObstacleCollision,
  onObstacleOffscreen,
  onCoinCollect,
  onCoinOffscreen,
}) {
  const theme = useTheme();
  const dashOffset = useSharedValue(0);

  useEffect(() => {
    dashOffset.value = withRepeat(withTiming(DASH_UNIT, { duration: DASH_SCROLL_MS, easing: Easing.linear }), -1, false);
  }, [dashOffset]);

  const handleLayout = useCallback(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      onLayoutSize(width, height);
    },
    [onLayoutSize]
  );

  const dashStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dashOffset.value }],
  }));

  const ready = trackWidth > 0 && trackHeight > 0;
  const dividerXs = ready ? [trackWidth / LANE_COUNT, (trackWidth / LANE_COUNT) * 2] : [];
  const dashCount = ready ? Math.ceil((trackHeight + DASH_UNIT) / DASH_UNIT) : 0;

  return (
    <LaneInput onSwipe={onSwipe} style={styles.fill}>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]} onLayout={handleLayout}>
        {dividerXs.map((x) => (
          <Animated.View key={x} style={[styles.dividerColumn, dashStyle, { left: x - DASH_WIDTH / 2 }]}>
            {Array.from({ length: dashCount }).map((_, i) => (
              <View key={i} style={[styles.dash, { top: i * DASH_UNIT, backgroundColor: theme.border }]} />
            ))}
          </Animated.View>
        ))}

        {ready &&
          obstacles.map((obstacle) => (
            <Obstacle
              key={obstacle.id}
              lane={obstacle.lane}
              trackWidth={trackWidth}
              trackHeight={trackHeight}
              speedMultiplier={obstacle.speedMultiplier}
              engine={engine}
              onCollision={() => onObstacleCollision(obstacle.id)}
              onOffscreen={() => onObstacleOffscreen(obstacle.id)}
            />
          ))}

        {ready &&
          coins.map((coin) => (
            <Coin
              key={coin.id}
              lane={coin.lane}
              trackWidth={trackWidth}
              trackHeight={trackHeight}
              speedMultiplier={coin.speedMultiplier}
              engine={engine}
              onCollect={() => onCoinCollect(coin.id)}
              onOffscreen={() => onCoinOffscreen(coin.id)}
            />
          ))}

        {ready && <PlayerCar engine={engine} trackHeight={trackHeight} />}
      </View>
    </LaneInput>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  track: {
    flex: 1,
    overflow: 'hidden',
    // Web has no native GestureDetector driving this view, so LaneInput's own
    // tap-zones (rendered as a sibling overlay there) need the track itself
    // to stay hit-testable underneath them.
    ...(Platform.OS === 'web' ? { position: 'relative' } : null),
  },
  dividerColumn: {
    position: 'absolute',
    width: DASH_WIDTH,
    top: -DASH_UNIT,
    bottom: 0,
  },
  dash: {
    position: 'absolute',
    width: DASH_WIDTH,
    height: DASH_HEIGHT,
    borderRadius: DASH_WIDTH / 2,
  },
});
