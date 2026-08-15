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

const CHANNEL_ID = 'daily-reminder';

export { getNotificationsEnabled };

// Loaded on demand, never at module scope: importing expo-notifications pulls
// in its device-push auto-registration side effect, which throws on Expo Go
// (remote push was removed there in SDK 53). Deferring it keeps app startup —
// and expo-router's route scan, which imports every screen — clean; local
// scheduled reminders still work once the user actually turns them on.
function loadNotifications() {
  return require('expo-notifications');
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  const Notifications = loadNotifications();
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
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
  const granted = await Notifications.getPermissionsAsync()
    .then((result) => result.status === 'granted')
    .catch(() => false);

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
