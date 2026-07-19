import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { OnboardingDemoCard } from '@/components/onboarding/onboarding-demo-card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTopicHues } from '@/hooks/use-theme';

const { width } = Dimensions.get('window');

// Parallax content for one onboarding page: fades/lifts/scales in as it
// nears the center of the viewport while swiping, driven by the shared
// scrollX value from the parent's Animated.ScrollView.
export function OnboardingSlide({ index, scrollX, hue, heading, body, demo, tags }) {
  const hues = useTopicHues();

  const animatedStyle = useAnimatedStyle(() => {
    const distance = scrollX.value - index * width;
    const opacity = interpolate(distance, [-width, 0, width], [0, 1, 0], 'clamp');
    const translateY = interpolate(distance, [-width, 0, width], [18, 0, 18], 'clamp');
    const scale = interpolate(distance, [-width, 0, width], [0.94, 1, 0.94], 'clamp');
    return { opacity, transform: [{ translateY }, { scale }] };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <ThemedText type="title" style={styles.heading}>
          {heading}
        </ThemedText>

        <ThemedText themeColor="textSecondary" style={styles.body}>
          {body}
        </ThemedText>

        <OnboardingDemoCard {...demo} />

        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: hues[hue].surface }]}>
              <ThemedText type="smallBold" style={{ color: hues[hue].fg }}>
                {tag}
              </ThemedText>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    paddingHorizontal: Spacing.four,
  },
  content: {
    gap: Spacing.three,
  },
  heading: {
    fontSize: 36,
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
});
