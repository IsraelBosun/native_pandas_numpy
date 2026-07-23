import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

// gesture-handler's web pointer support isn't built for a directional swipe
// gesture, so web gets its own input scheme: tap either half of the track to
// move one lane that way, plus arrow keys — same one-lane-at-a-time contract
// as the native Fling gesture (`onSwipe(-1 | 1)`).
export function LaneInput({ onSwipe, style, children }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'ArrowLeft') onSwipe(-1);
      else if (event.key === 'ArrowRight') onSwipe(1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwipe]);

  return (
    <View style={[styles.fill, style]}>
      {children}
      <View style={styles.tapZones} pointerEvents="box-none">
        <Pressable style={styles.tapZone} onPress={() => onSwipe(-1)} />
        <Pressable style={styles.tapZone} onPress={() => onSwipe(1)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  tapZone: {
    flex: 1,
  },
});
