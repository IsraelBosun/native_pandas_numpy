import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PracticeSessionScreen } from '@/components/practice/practice-session-screen';
import { SessionSummary } from '@/components/session-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavoritesSession } from '@/hooks/use-favorites-session';

export default function FavoritesPracticeScreen() {
  const router = useRouter();
  const session = useFavoritesSession();

  if (session.loading) return null;

  if (session.total === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyWrap}>
            <ThemedText type="subtitle">No starred cards yet</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Tap the star on a card during Review to add it here.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (session.complete) {
    return (
      <SessionSummary reviewed={session.stats.reviewed} missed={session.stats.missed} onDone={() => router.back()} />
    );
  }

  return <PracticeSessionScreen session={session} modeLabel="Starred" onToggleFavorite={session.toggleFavorite} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
});
