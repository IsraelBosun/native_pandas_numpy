import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { getLifetimeXp } from '@/lib/cards';
import {
  fetchLeaderboard,
  getMyProfile,
  setLeaderboardOptIn,
  setUsername,
} from '@/lib/leaderboard';
import { validateUsername } from '@/lib/username';

export default function LeaderboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();

  const [myXp, setMyXp] = useState(null);
  const [profile, setProfile] = useState(undefined); // undefined = loading
  const [entries, setEntries] = useState(undefined); // undefined = loading
  const [listError, setListError] = useState(null);

  const loadBoard = useCallback(async () => {
    setListError(null);
    const result = await fetchLeaderboard();
    if (result.error) {
      setEntries([]);
      setListError(result.error);
      return;
    }
    setEntries(result.entries);
  }, []);

  const loadProfile = useCallback(async () => {
    const result = await getMyProfile();
    setProfile(result.error ? null : result.profile);
  }, []);

  useEffect(() => {
    if (!auth.signedIn) return;
    getLifetimeXp().then(setMyXp);
    loadProfile();
    loadBoard();
  }, [auth.signedIn, loadProfile, loadBoard]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="subtitle">Leaderboard</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {!auth.signedIn ? (
            <SignedOutPrompt onLogIn={() => router.replace('/auth/sign-in')} />
          ) : (
            <>
              <YourSpotCard
                myXp={myXp}
                profile={profile}
                onProfileChange={() => {
                  loadProfile();
                  loadBoard();
                }}
              />
              <BoardList entries={entries} error={listError} onRetry={loadBoard} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SignedOutPrompt({ onLogIn }) {
  const theme = useTheme();
  return (
    <View style={[styles.emptyCard, { borderColor: theme.border }]}>
      <Feather name="award" size={28} color={theme.textSecondary} />
      <ThemedText type="smallBold" style={styles.centerText}>
        Join the leaderboard
      </ThemedText>
      <ThemedText themeColor="textSecondary" type="small" style={styles.centerText}>
        Create a free account to pick a username and compare your XP with other learners.
      </ThemedText>
      <ScalePressable haptic="light" onPress={onLogIn}>
        <View style={[styles.primaryButton, { backgroundColor: theme.action }]}>
          <ThemedText type="smallBold" style={styles.onAction}>
            Create an account
          </ThemedText>
        </View>
      </ScalePressable>
    </View>
  );
}

// The user's own row: pick/change a username, flip visibility, see their XP.
// Opting in is gated on having a username, so someone can never appear as a
// blank entry.
function YourSpotCard({ myXp, profile, onProfileChange }) {
  const theme = useTheme();

  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [savingName, setSavingName] = useState(false);
  const [savingOptIn, setSavingOptIn] = useState(false);

  const loading = profile === undefined;
  const username = profile?.username ?? null;
  const optedIn = profile?.show_on_leaderboard ?? false;

  async function handleSaveName() {
    const check = validateUsername(draft);
    if (check.error) {
      setError(check.error);
      return;
    }
    setError(null);
    setSavingName(true);
    const result = await setUsername(check.value);
    setSavingName(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    onProfileChange();
  }

  async function handleToggleOptIn(next) {
    setSavingOptIn(true);
    const result = await setLeaderboardOptIn(next);
    setSavingOptIn(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    onProfileChange();
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.spotCard, { borderColor: theme.border }]}>
      <View style={styles.spotHeader}>
        <View style={styles.spotHeaderText}>
          <ThemedText type="label" themeColor="textSecondary">
            Your XP
          </ThemedText>
          <ThemedText style={styles.xpValue}>{myXp == null ? '—' : myXp}</ThemedText>
        </View>
        <Feather name="zap" size={22} color={theme.action} />
      </View>

      {loading ? (
        <ActivityIndicator size="small" style={styles.spotLoading} />
      ) : editing || !username ? (
        <View style={styles.nameEditor}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={username ?? 'Choose a username'}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            onSubmitEditing={handleSaveName}
            returnKeyType="done"
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
            ]}
          />
          <ScalePressable haptic="light" onPress={handleSaveName} disabled={savingName}>
            <View style={[styles.saveButton, { backgroundColor: theme.action }]}>
              {savingName ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText type="smallBold" style={styles.onAction}>
                  Save
                </ThemedText>
              )}
            </View>
          </ScalePressable>
        </View>
      ) : (
        <View style={styles.nameRow}>
          <View style={styles.nameRowText}>
            <ThemedText type="label" themeColor="textSecondary">
              Username
            </ThemedText>
            <ThemedText type="smallBold">{username}</ThemedText>
          </View>
          <Pressable
            onPress={() => {
              setDraft(username);
              setError(null);
              setEditing(true);
            }}
            hitSlop={8}>
            <ThemedText type="small" style={{ color: theme.action }}>
              Edit
            </ThemedText>
          </Pressable>
        </View>
      )}

      <View style={[styles.optInRow, { borderTopColor: theme.border }]}>
        <View style={styles.optInText}>
          <ThemedText type="smallBold">Show me on the leaderboard</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {username
              ? 'Other learners see your username and XP.'
              : 'Pick a username first to appear.'}
          </ThemedText>
        </View>
        {savingOptIn ? (
          <ActivityIndicator size="small" />
        ) : (
          <Switch
            value={optedIn}
            onValueChange={handleToggleOptIn}
            disabled={!username}
            trackColor={{ false: theme.backgroundSelected, true: theme.action }}
            thumbColor="#FFFFFF"
          />
        )}
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

function BoardList({ entries, error, onRetry }) {
  const theme = useTheme();

  if (entries === undefined) {
    return <ActivityIndicator size="small" style={styles.listLoading} />;
  }

  if (error) {
    return (
      <View style={[styles.emptyCard, { borderColor: theme.border }]}>
        <Feather name="wifi-off" size={24} color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary" type="small" style={styles.centerText}>
          {error}
        </ThemedText>
        <Pressable onPress={onRetry} hitSlop={8}>
          <ThemedText type="smallBold" style={{ color: theme.action }}>
            Try again
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={[styles.emptyCard, { borderColor: theme.border }]}>
        <Feather name="users" size={24} color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary" type="small" style={styles.centerText}>
          No one is on the board yet. Opt in above and be the first.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {entries.map((entry, index) => (
        <Row key={`${entry.username}-${index}`} entry={entry} rank={index + 1} />
      ))}
    </View>
  );
}

function Row({ entry, rank }) {
  const theme = useTheme();
  const highlight = entry.is_me;

  return (
    <ThemedView
      type={highlight ? 'backgroundSelected' : 'backgroundElement'}
      style={[
        styles.row,
        { borderColor: highlight ? theme.action : theme.border },
        highlight && styles.rowMe,
      ]}>
      <ThemedText type="smallBold" style={[styles.rank, { color: theme.textSecondary }]}>
        {rank}
      </ThemedText>
      <View style={styles.rowText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {entry.username}
          {highlight ? '  (you)' : ''}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {entry.reviews} {entry.reviews === 1 ? 'review' : 'reviews'}
        </ThemedText>
      </View>
      <View style={styles.xpTag}>
        <ThemedText type="smallBold" style={{ color: theme.action }}>
          {entry.xp}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          XP
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  spotCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotHeaderText: {
    gap: Spacing.half,
  },
  xpValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  spotLoading: {
    alignSelf: 'flex-start',
  },
  nameEditor: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  saveButton: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRowText: {
    gap: Spacing.half,
  },
  optInRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  optInText: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  list: {
    gap: Spacing.two,
  },
  listLoading: {
    marginTop: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  rowMe: {
    borderWidth: 1.5,
  },
  rank: {
    minWidth: 24,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  xpTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  onAction: {
    color: '#FFFFFF',
  },
});
