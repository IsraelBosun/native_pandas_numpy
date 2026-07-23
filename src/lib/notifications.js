import { Platform } from 'react-native';

import {
  getNotificationsEnabled,
  getScheduledReminderId,
  setNotificationsEnabled as persistEnabled,
  setScheduledReminderId,
} from './cards';

const REMINDER_HOUR = 18;
const REMINDER_MINUTE = 0;
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

async function cancelExistingReminder() {
  const id = await getScheduledReminderId();
  if (id) {
    const Notifications = loadNotifications();
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await setScheduledReminderId(null);
  }
}

// Requests permission, schedules a repeating daily reminder, and persists
// both the on/off flag and the OS-assigned schedule id (so it can be
// cancelled later). Returns false if unsupported (web) or the user denied
// the permission prompt — callers should revert their toggle UI in that case.
export async function enableDailyReminder() {
  if (Platform.OS === 'web') return false;

  const Notifications = loadNotifications();
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    await persistEnabled(false);
    return false;
  }

  await ensureChannel();
  await cancelExistingReminder();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to review',
      body: "You've got pandas cards waiting. A few minutes keeps your streak alive.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    },
  });

  await setScheduledReminderId(id);
  await persistEnabled(true);
  return true;
}

export async function disableDailyReminder() {
  await cancelExistingReminder();
  await persistEnabled(false);
}
