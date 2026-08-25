import { Platform } from 'react-native';

import {
  getAllDueDates,
  getNotificationsEnabled,
  getRecentReviewHours,
  getScheduledReminderIds,
  getStreakState,
  setNotificationsEnabled as persistEnabled,
  setScheduledReminderIds,
} from './cards';
import { todayISO } from './date';
import { planReminders } from './reminders';

// Bumped to v2 to re-create the channel at HIGH importance — see ensureChannel.
// Android ignores importance changes to an existing channel, so a new id is the
// only way to raise it for users who already have the old one.
const LEGACY_CHANNEL_ID = 'daily-reminder';
const CHANNEL_ID = 'daily-reminder-v2';

export { getNotificationsEnabled };

// Loaded on demand, never at module scope: importing expo-notifications pulls
// in its device-push auto-registration side effect, which throws on Expo Go
// (remote push was removed there in SDK 53). Deferring it keeps app startup —
// and expo-router's route scan, which imports every screen — clean; local
// scheduled reminders still work once the user actually turns them on.
function loadNotifications() {
  return require('expo-notifications');
}

// Without a handler, a notification arriving while the app is RUNNING is
// discarded rather than shown — the library's documented default is not to
// present it. Reminders fire around the hour the user usually studies, which
// is exactly when the app is most likely to be open, so its absence was
// silently eating them. Installed lazily, to preserve the deferred-require
// rule above; setting it is idempotent but cheap to guard.
let handlerInstalled = false;
function ensureHandler(Notifications) {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // Consistent with the channel's HIGH importance: a reminder the user
      // opted into is worth hearing. Muting it here would reintroduce the
      // "did I even get one?" problem the channel raise exists to fix.
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  const Notifications = loadNotifications();
  // HIGH, not DEFAULT: DEFAULT posts to the tray without a heads-up banner, so
  // a reminder arriving with the phone pocketed is easily never seen. A single
  // daily nudge the user opted into earns the peek.
  //
  // NOTE: Android freezes a channel's importance at CREATION — this raise only
  // affects installs that have not already created `daily-reminder`. Hence the
  // version suffix below; the old channel is deleted so it stops showing up as
  // a stale, empty entry in system settings.
  await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID).catch(() => {});
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function cancelExistingReminders() {
  const ids = await getScheduledReminderIds();
  if (ids.length === 0) return;

  const Notifications = loadNotifications();
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  await setScheduledReminderIds([]);
}

// Books one plan entry. DATE triggers need a real Date; the plan speaks in
// local calendar dates, so it is constructed with local-time components.
async function bookEntry(Notifications, entry) {
  const [year, month, day] = entry.date.split('-').map(Number);
  const when = new Date(year, month - 1, day, entry.hour, entry.minute, 0, 0);

  // A plan entry for earlier today is already past by the time we book it —
  // scheduling it would fire immediately, which reads as a bug to the user.
  if (when.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content: { title: entry.title, body: entry.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
}

// Cancel everything pending, then book the fresh plan. Always both, always in
// that order — a reschedule that only adds is how you end up double-notifying.
// Safe to call whenever; it is a no-op when reminders are off.
export async function rescheduleReminders({ today = todayISO() } = {}) {
  if (Platform.OS === 'web') return [];
  if (!(await getNotificationsEnabled())) return [];

  const Notifications = loadNotifications();
  ensureHandler(Notifications);
  // A THROW here is not a denial — it is us failing to ask. Treating the two
  // alike would persist notifications_enabled = false off a transient error,
  // silently turning reminders off for good with nothing shown to the user.
  // Only an answered-and-not-granted result may disable them.
  let granted;
  try {
    const result = await Notifications.getPermissionsAsync();
    granted = result.status === 'granted';
  } catch {
    return [];
  }

  // Permission revoked in system settings since the toggle was flipped: stop
  // claiming reminders are on rather than silently booking into the void.
  if (!granted) {
    await cancelExistingReminders();
    await persistEnabled(false);
    return [];
  }

  await ensureChannel();
  await cancelExistingReminders();

  const [dueDates, reviewHours, streak] = await Promise.all([
    getAllDueDates(),
    getRecentReviewHours(),
    getStreakState(),
  ]);

  const plan = planReminders({
    dueDates,
    reviewHours,
    streak: streak.count,
    lastStudyDate: streak.lastStudyDate,
    today,
  });

  const ids = [];
  for (const entry of plan) {
    const id = await bookEntry(Notifications, entry).catch(() => null);
    if (id) ids.push(id);
  }
  await setScheduledReminderIds(ids);
  return plan;
}

// Requests permission and books the first plan. Returns false if unsupported
// (web) or the user denied the prompt — callers should revert their toggle.
export async function enableDailyReminder() {
  if (Platform.OS === 'web') return false;

  const Notifications = loadNotifications();
  ensureHandler(Notifications);
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    await persistEnabled(false);
    return false;
  }

  await persistEnabled(true);
  await rescheduleReminders();
  return true;
}

export async function disableDailyReminder() {
  await cancelExistingReminders();
  await persistEnabled(false);
}
