import * as Notifications from 'expo-notifications';
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

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function cancelExistingReminder() {
  const id = await getScheduledReminderId();
  if (id) {
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
      body: "You've got pandas cards waiting — a few minutes keeps your streak alive.",
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
