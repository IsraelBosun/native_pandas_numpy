import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
  useFonts,
} from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/hooks/use-auth';
import { useThemeName } from '@/hooks/use-theme';
import { ThemePreferenceProvider } from '@/hooks/use-theme-preference';
import { bootstrap } from '@/lib/bootstrap';
import { hasSeenOnboarding } from '@/lib/cards';
import { parseRecoveryLink } from '@/lib/recovery-link';

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
    <GestureHandlerRootView style={styles.root}>
      <ThemePreferenceProvider>
        <AuthProvider>
          <AnimatedSplashOverlay />
          {ready && fontsLoaded && <NavigationTree needsOnboarding={needsOnboarding} />}
        </AuthProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

const styles = { root: { flex: 1 } };

// Split out so useThemeName() (which needs ThemePreferenceProvider above it)
// only resolves once the provider has mounted.
function NavigationTree({ needsOnboarding }) {
  const themeName = useThemeName();
  // A returning user resetting their password on a fresh install hasn't seen
  // onboarding, so the redirect below would otherwise yank them off the
  // recovery link before they can set a new password.
  const recovering = parseRecoveryLink(Linking.useURL()) !== null;

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
        <Stack.Screen name="practice/race/[topic]" />
        <Stack.Screen name="auth/sign-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="auth/reset-password" options={{ presentation: 'modal' }} />
      </Stack>
      {needsOnboarding && !recovering && <Redirect href="/onboarding" />}
    </ThemeProvider>
  );
}
