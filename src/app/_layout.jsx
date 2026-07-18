import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useThemeName } from '@/hooks/use-theme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';
import { bootstrap } from '@/lib/bootstrap';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bootstrap().finally(() => setReady(true));
  }, []);

  return (
    <ThemePreferenceProvider>
      <AnimatedSplashOverlay />
      {ready && <NavigationTree />}
    </ThemePreferenceProvider>
  );
}

// Split out so useThemeName() (which needs ThemePreferenceProvider above it)
// only resolves once the provider has mounted.
function NavigationTree() {
  const themeName = useThemeName();

  return (
    <ThemeProvider value={themeName === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} animated />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[topicId]" />
        <Stack.Screen name="review" />
        <Stack.Screen name="practice/[topic]" />
        <Stack.Screen name="practice/challenge/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
