/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Gradients, TopicHues } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeName() {
  const scheme = useColorScheme();
  return scheme === 'unspecified' ? 'light' : scheme;
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
