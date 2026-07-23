import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { dismissSavePrompt, getTotalReviewCount, isSavePromptDismissed } from '@/lib/cards';

// Reviews on this device before we suggest an account. Asking on a blank first
// launch is asking a stranger to sign up for nothing; asking once they've built
// something worth losing is a real offer.
const MIN_REVIEWS = 10;

export function SaveProgressCard() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const [eligible, setEligible] = useState(false);

  const hidden = !auth.available || auth.signedIn || auth.loading;

  useEffect(() => {
    if (hidden) return;
    Promise.all([getTotalReviewCount(), isSavePromptDismissed()]).then(([reviews, dismissed]) => {
      setEligible(reviews >= MIN_REVIEWS && !dismissed);
    });
  }, [hidden]);

  if (hidden || !eligible) return null;

  function handleDismiss() {
    setEligible(false);
    dismissSavePrompt();
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconChip, { backgroundColor: theme.actionMuted }]}>
          <Feather name="upload-cloud" size={16} color={theme.action} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">Back up your progress</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Everything you've learned lives only on this phone. A free account keeps it safe.
          </ThemedText>
        </View>
        <Pressable onPress={handleDismiss} hitSlop={12}>
          <Feather name="x" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScalePressable haptic="light" onPress={() => router.push('/auth/sign-in')}>
        <View style={[styles.button, { backgroundColor: theme.action }]}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            Create free account
          </ThemedText>
        </View>
      </ScalePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  buttonText: {
    color: '#FFFFFF',
  },
});
