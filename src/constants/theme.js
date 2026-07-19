/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#101828',
    background: '#F6F7FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8EBF2',
    textSecondary: '#5D6673',
    border: 'rgba(16, 24, 40, 0.08)',
    // Semantic tokens — color = meaning: blue=action, green=mastered, orange=weak, red=failed.
    action: '#2F6FED',
    // Muted tint of `action` for selected-state surfaces (tab indicator pill).
    actionMuted: '#E3EBFC',
    success: '#1F9254',
    warning: '#D97706',
    danger: '#DC2626',
    // Muted tint of `danger` for highlighted-cell surfaces (onboarding demo table).
    dangerMuted: '#FBE7E7',
  },
  dark: {
    text: '#F3F5F9',
    background: '#0C111C',
    backgroundElement: '#161D2B',
    backgroundSelected: '#222B3D',
    textSecondary: '#98A2B3',
    border: 'rgba(255, 255, 255, 0.07)',
    action: '#4D8DFF',
    actionMuted: '#1D2E4F',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    dangerMuted: '#3B1E20',
  },
};

// Decorative per-topic identity palette — `fg` for icons/accents/progress,
// `surface` as the muted tint behind icon chips. Semantic Colors above still
// own meaning (action/success/warning/danger); these hues only say "which
// topic am I", so they may repeat across topics but never carry state.
export const TopicHues = {
  light: {
    blue: { fg: '#2F6FED', surface: '#E7EEFD' },
    violet: { fg: '#7C3AED', surface: '#F1EAFE' },
    teal: { fg: '#0D9488', surface: '#DFF5F2' },
    amber: { fg: '#B45309', surface: '#FBEEDB' },
    pink: { fg: '#DB2777', surface: '#FCE7F1' },
    green: { fg: '#15803D', surface: '#E3F4E8' },
    indigo: { fg: '#4F46E5', surface: '#E9E8FD' },
    orange: { fg: '#C2410C', surface: '#FCEBE0' },
  },
  dark: {
    blue: { fg: '#5B9CFF', surface: '#1B2A47' },
    violet: { fg: '#A78BFA', surface: '#2B2350' },
    teal: { fg: '#2DD4BF', surface: '#123B3B' },
    amber: { fg: '#FBBF24', surface: '#3C2E12' },
    pink: { fg: '#F472B6', surface: '#3E1F33' },
    green: { fg: '#4ADE80', surface: '#173A26' },
    indigo: { fg: '#818CF8', surface: '#242A55' },
    orange: { fg: '#FB923C', surface: '#3E2417' },
  },
};

// One gradient per screen, max — currently only the Home hero card.
export const Gradients = {
  hero: {
    light: ['#2F6FED', '#6D3BEF'],
    dark: ['#3B6FE8', '#7C4DFF'],
  },
};

// Shape language: lg for cards, xl for hero surfaces, pill for chips/pills.
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

// A "theme color" is any key shared by both Colors.light and Colors.dark, e.g. `theme[colorKey]`.

// Code-token colors for the syntax-highlighted code block — kept separate from
// Colors since ThemedText/ThemedView assume `theme[key]` is a single color
// string, and these only apply to specific token kinds, not whole surfaces.
export const SyntaxColors = {
  light: {
    keyword: '#AF00DB',
    string: '#0B7A3B',
    number: '#B5860B',
    method: '#1750EB',
    comment: '#6B7280',
  },
  dark: {
    keyword: '#C586C0',
    string: '#4ADE80',
    number: '#F5B94D',
    method: '#60A5FA',
    comment: '#8B949E',
  },
};

// App-wide typeface: JetBrains Mono, loaded via useFonts() in the root layout
// (see `Weight` below for which family maps to which numeric fontWeight —
// custom TTFs don't support synthetic bold, so ThemedText picks a family per
// weight instead of relying on the `fontWeight` style prop).
export const Fonts = {
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_700Bold',
};

// Maps a design "weight" to the matching loaded font family.
export function fontFamilyForWeight(weight) {
  if (weight >= 700) return Fonts.monoBold;
  if (weight >= 600) return Fonts.monoSemiBold;
  if (weight >= 500) return Fonts.monoMedium;
  return Fonts.mono;
}

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
};

// The web tab bar is fixed-positioned over content (see (tabs)/_layout.web.jsx),
// so scrollable screens need clearance there too, not just on native.
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 90 }) ?? 0;
export const MaxContentWidth = 800;
