import { StyleSheet } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

// Fling over Pan — a lane switch is one quick directional swipe, not a
// tracked drag, so there's no threshold-tuning needed. Gesture.Race lets
// either direction win without the two competing.
export function LaneInput({ onSwipe, style, children }) {
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .onEnd(() => onSwipe(-1));

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .runOnJS(true)
    .onEnd(() => onSwipe(1));

  return (
    <GestureDetector gesture={Gesture.Race(flingLeft, flingRight)}>
      <Animated.View style={[styles.fill, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
