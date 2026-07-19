import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
  useFonts,
} from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useThemeName } from '@/hooks/use-theme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';
import { bootstrap } from '@/lib/bootstrap';
import { hasSeenOnboarding } from '@/lib/cards';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    bootstrap()
      .then(() => hasSeenOnboarding())
      .then((seen) => setNeedsOnboarding(!seen))
      .finally(() => setReady(true));
  }, []);

  return (
    <ThemePreferenceProvider>
      <AnimatedSplashOverlay />
      {ready && fontsLoaded && <NavigationTree needsOnboarding={needsOnboarding} />}
    </ThemePreferenceProvider>
  );
}

// Split out so useThemeName() (which needs ThemePreferenceProvider above it)
// only resolves once the provider has mounted.
function NavigationTree({ needsOnboarding }) {
  const themeName = useThemeName();

  return (
    <ThemeProvider value={themeName === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} animated />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="lesson/[topicId]" />
        <Stack.Screen name="review" />
        <Stack.Screen name="practice/[topic]" />
        <Stack.Screen name="practice/challenge/[id]" />
      </Stack>
      {needsOnboarding && <Redirect href="/onboarding" />}
    </ThemeProvider>
  );
}
