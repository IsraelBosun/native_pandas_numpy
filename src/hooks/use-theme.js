/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Gradients, TopicHues } from '@/constants/theme';
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
