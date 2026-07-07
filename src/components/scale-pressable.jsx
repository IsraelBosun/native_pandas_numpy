import * as Haptics from 'expo-haptics';
import { Platform, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Snappy, non-bouncy press spring — settles fast so rapid taps never lag.
const PRESS_SPRING = { damping: 22, stiffness: 380, mass: 0.6 };

const HAPTICS = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

export function triggerHaptic(kind) {
  if (Platform.OS === 'web' || !HAPTICS[kind]) return;
  HAPTICS[kind]().catch(() => {}); // haptics are decoration — never let them throw
}

// The one press-feedback primitive for the app: scales down on the UI thread
// (transform only, no re-render) and optionally fires a haptic on press.
export function ScalePressable({ onPress, haptic, scaleTo = 0.97, style, children, ...rest }) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pressed.value * (scaleTo - 1) }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, PRESS_SPRING);
      }}
      onPress={(event) => {
        if (haptic) triggerHaptic(haptic);
        onPress?.(event);
      }}
      style={[animatedStyle, style]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
