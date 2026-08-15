import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  bumpReminderPromptCount,
  getNotificationsEnabled,
  getReminderPromptCount,
  getReminderPromptReviews,
  getTotalReviewCount,
  isReminderPromptSettled,
  settleReminderPrompt,
} from '@/lib/cards';
import { enableDailyReminder } from '@/lib/notifications';

// The soft ask, shown at most this many times in total: once at the end of
// onboarding, then up to three gentler re-asks later.
//
// This is our own card, not the OS dialog. That distinction is the whole
// design: on iOS the system permission prompt can be shown exactly ONCE and
// a denial is permanent, so we only ever trigger it after the user has said
// yes to this. Declining here costs nothing and leaves the real ask intact.
export const MAX_ASKS = 4;

// Reviews a user must do between one ask and the next. Without this, declining
// on Home would put the same card back on the next mount, which is the exact
// nagging the soft-ask pattern is meant to avoid. The onboarding ask is exempt
// — it is the first, and there is nothing before it to space it from.
const REVIEWS_BETWEEN_ASKS = 15;

// Copy per ask. The first lands right after onboarding, where the user has
// context but no history; later ones can point at what they have actually
// built. Never guilt, and each one has to be true.
const ASKS = [
  {
    title: 'Want a nudge when cards are due?',
    body: 'Spaced repetition only works if you come back. We’ll remind you on days you actually have cards — and stay quiet otherwise.',
    accept: 'Remind me',
    decline: 'Not now',
  },
  {
    title: 'Keep your streak alive?',
    body: 'A reminder on the days you have cards due, around the time you usually study.',
    accept: 'Turn on reminders',
    decline: 'Not now',
  },
  {
    title: 'Never miss a review day',
    body: 'We only notify you when something is actually due — no daily spam.',
    accept: 'Turn on reminders',
    decline: 'Not now',
  },
  {
    title: 'One last offer',
    body: 'Reminders help the habit stick. You can always turn them on in Settings instead.',
    accept: 'Turn them on',
    decline: 'No thanks',
  },
];

/**
 * Renders the reminder soft ask, or nothing at all.
 *
 * Self-gating: it decides on its own whether this user should see an ask right
 * now, so callers just drop it in. `onResolved` fires once the user has
 * answered either way; `onUnavailable` fires when there is no ask to show at
 * all, so a screen hosting this as its only content can move on instead of
 * stranding the user.
 */
export function ReminderPrompt({ onResolved, onUnavailable, style }) {
  const theme = useTheme();
  const [askIndex, setAskIndex] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Reminders are unavailable on web, and there is no point asking someone
    // who already said yes — or who has already settled the question.
    async function decide() {
      if (Platform.OS === 'web') return null;
      const [enabled, settled, count] = await Promise.all([
        getNotificationsEnabled(),
        isReminderPromptSettled(),
        getReminderPromptCount(),
      ]);
      if (enabled || settled || count >= MAX_ASKS) return null;

      // First ask (onboarding) is unconditional; every re-ask has to be earned
      // by real use since the last one.
      if (count > 0) {
        const [reviews, atLastAsk] = await Promise.all([
          getTotalReviewCount(),
          getReminderPromptReviews(),
        ]);
        if (reviews - atLastAsk < REVIEWS_BETWEEN_ASKS) return null;
      }
      return count;
    }

    decide().then((index) => {
      if (cancelled) return;
      setAskIndex(index);
      // Only for the opening gate: once the user has answered, handleAccept /
      // handleDecline own the hand-off via onResolved.
      if (index == null) onUnavailable?.();
    });
    return () => {
      cancelled = true;
    };
    // Callbacks are host-owned and stable in practice; re-running the gate on
    // an inline arrow prop would re-ask on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (askIndex == null) return null;

  const ask = ASKS[Math.min(askIndex, ASKS.length - 1)];
  const isLastAsk = askIndex >= MAX_ASKS - 1;

  async function handleAccept() {
    if (busy) return;
    setBusy(true);

    // Only a "yes" here reaches the OS dialog. If they deny that, the toggle
    // in Settings is the remaining route, so stop asking either way.
    await bumpReminderPromptCount();
    await enableDailyReminder().catch(() => false);
    await settleReminderPrompt();

    setAskIndex(null);
    onResolved?.();
  }

  async function handleDecline() {
    if (busy) return;
    setBusy(true);

    const shown = await bumpReminderPromptCount();
    // Out of asks — let it go rather than nagging forever.
    if (shown >= MAX_ASKS) await settleReminderPrompt();

    setAskIndex(null);
    onResolved?.();
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}>
      <View style={styles.header}>
        <View style={[styles.iconChip, { backgroundColor: theme.actionMuted }]}>
          <Feather name="bell" size={16} color={theme.action} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{ask.title}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {ask.body}
          </ThemedText>
        </View>
      </View>

      <ScalePressable haptic="light" onPress={handleAccept} disabled={busy}>
        <View style={[styles.button, { backgroundColor: theme.action }, busy && styles.disabled]}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            {ask.accept}
          </ThemedText>
        </View>
      </ScalePressable>

      <Pressable onPress={handleDecline} disabled={busy} hitSlop={8} style={styles.decline}>
        <ThemedText type="small" themeColor="textSecondary">
          {isLastAsk ? ASKS[ASKS.length - 1].decline : ask.decline}
        </ThemedText>
      </Pressable>
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
  decline: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
