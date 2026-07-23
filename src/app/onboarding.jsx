import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  interpolateColor,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { OnboardingSlide } from '@/components/onboarding/onboarding-slide';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useTopicHues } from '@/hooks/use-theme';
import { markOnboardingSeen } from '@/lib/cards';
import { getAllCards, TOPICS } from '@/lib/content';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(height * 0.44);

const CARD_COUNT = getAllCards().length;
const TOPIC_COUNT = TOPICS.length;

const SLIDES = [
  {
    badge: '01 · learn',
    hue: 'blue',
    heading: 'Learn the\nreal API',
    body: "Short, visual lessons teach you pandas & NumPy the way you'll actually use them, no fluff.",
    demo: {
      headCode: "df.groupby('region')['revenue'].sum()",
      table: {
        columns: ['region', 'revenue'],
        rows: [
          ['west', 120],
          ['east', 95],
        ],
      },
    },
    tags: [`${TOPIC_COUNT} topics`],
  },
  {
    badge: '02 · drill',
    hue: 'teal',
    heading: 'Recall,\nnot re-reading',
    body: 'Every card makes you write the expression before it shows you the answer.',
    demo: {
      headCode: 'df.head(3)',
      table: {
        columns: ['', 'tenor', 'npl'],
        rows: [
          [0, 12, 0.04],
          [1, 24, 0.11],
          [2, 36, 0.29],
        ],
        highlight: { row: 2, col: 2 },
      },
      tailCode: '> df[df.npl > 0.2]',
    },
    tags: [`${CARD_COUNT} cards`, 'spaced repeat'],
  },
  {
    badge: '03 · grow',
    hue: 'amber',
    heading: 'Streaks,\nnot cramming',
    body: 'A few minutes a day. Track your streak, mastery, and achievements as you build the habit.',
    demo: {
      headCode: "df.groupby('day')['reviews'].sum()",
      table: {
        columns: ['day', 'reviews'],
        rows: [
          ['mon', 12],
          ['tue', 18],
        ],
      },
    },
    tags: ['streaks', 'achievements'],
  },
];

const HERO_INPUT_RANGE = SLIDES.map((_, i) => i * width);

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const hues = useTopicHues();
  const scrollRef = useAnimatedRef();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Precomputed as plain arrays on the JS thread — calling `.map()` inside a
  // worklet crashes on native (Reanimated can't serialize the inline
  // callback across the JS/UI thread boundary), even though it's silently
  // fine on web.
  const heroColors = SLIDES.map((slide) => hues[slide.hue].surface);
  const heroStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollX.value, HERO_INPUT_RANGE, heroColors),
  }));

  function finish() {
    markOnboardingSeen();
    router.replace('/');
  }

  function goTo(nextIndex) {
    scrollTo(scrollRef, nextIndex * width, 0, true);
    setIndex(nextIndex);
  }

  function handleNext() {
    if (isLast) {
      finish();
    } else {
      goTo(index + 1);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.hero, { height: HERO_HEIGHT }, heroStyle]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: hues[SLIDES[index].hue].fg }]}>
            <ThemedText type="label" style={styles.badgeText}>
              {SLIDES[index].badge}
            </ThemedText>
          </View>
          <Pressable onPress={finish} hitSlop={12}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Skip
            </ThemedText>
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
          }}
          style={styles.scroll}>
          {SLIDES.map((slide, i) => (
            <OnboardingSlide key={slide.heading} index={i} scrollX={scrollX} {...slide} />
          ))}
        </Animated.ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.heading}
              style={[
                styles.dot,
                { backgroundColor: i === index ? theme.action : theme.border },
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => goTo(Math.max(0, index - 1))}
            disabled={index === 0}
            style={[
              styles.navButton,
              { borderColor: theme.border },
              index === 0 && styles.navButtonHidden,
            ]}>
            <Feather name="chevron-left" size={20} color={theme.text} />
          </Pressable>

          <ThemedText type="smallBold" themeColor="textSecondary">
            Screen {index + 1} of {SLIDES.length}
          </ThemedText>

          <Pressable
            onPress={handleNext}
            style={[styles.navButton, { borderColor: theme.border, backgroundColor: isLast ? theme.action : 'transparent' }]}>
            <Feather name={isLast ? 'check' : 'chevron-right'} size={20} color={isLast ? '#FFFFFF' : theme.text} />
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  badgeText: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  dotActive: {
    width: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonHidden: {
    opacity: 0,
  },
});
