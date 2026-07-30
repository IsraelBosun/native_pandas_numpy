/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { ChartColors, ChartSequential, Colors, Gradients, TopicHues } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference } from '@/hooks/use-theme-preference';

export function useThemeName() {
  const { preference } = useThemePreference();
  const systemScheme = useColorScheme();
  if (preference !== 'system') return preference;
  return systemScheme === 'unspecified' || !systemScheme ? 'light' : systemScheme;
}

export function useTheme() {
  return Colors[useThemeName()];
}

// Mode-resolved decorative palette: useTopicHues().violet → { fg, surface }.
export function useTopicHues() {
  return TopicHues[useThemeName()];
}

export function useGradient(name) {
  return Gradients[name][useThemeName()];
}

// Mode-resolved chart series palette, assigned by slot index and never cycled.
export function useChartColors() {
  return ChartColors[useThemeName()];
}

// Mode-resolved sequential ramp for heatmaps; index 0 is the lowest value.
export function useChartSequential() {
  return ChartSequential[useThemeName()];
}
