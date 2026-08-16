import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Habit } from '@/context/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('forgepromises_default', {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableLights: true,
      lightColor: '#FF6B00',
    });
    await Notifications.setNotificationChannelAsync('forgepromises_monk', {
      name: 'Monk Mode',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleHabitReminder(habit: Habit): Promise<void> {
  if (!habit.reminderTimes || habit.reminderTimes.length === 0) return;
  await cancelHabitReminders(habit.id);
  for (const timeStr of habit.reminderTimes) {
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (isNaN(hour) || isNaN(minute)) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `habit_${habit.id}_${hour}_${minute}`,
        content: {
          title: `${habit.emoji} ${habit.name}`,
          body: habit.description || 'Time to forge your habit!',
          data: { habitId: habit.id },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'forgepromises_default',
        },
      });
    } catch (error) {
      console.warn(`Failed to schedule reminder for habit ${habit.id}:`, error);
    }
  }
}

export async function cancelHabitReminders(habitId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(n => n.identifier.startsWith(`habit_${habitId}_`));
    await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch (error) {
    console.warn('Failed to cancel habit reminders:', error);
  }
}

export async function scheduleMonkModeNotification(remaining: number): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      identifier: 'monk_mode',
      content: {
        title: '🔥 Monk Mode Active',
        body: remaining > 0
          ? `${remaining} habit${remaining > 1 ? 's' : ''} remaining today. Stay focused.`
          : 'All habits complete! Outstanding discipline.',
        data: { type: 'monk_mode' },
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to schedule monk mode notification:', error);
  }
}

export async function cancelMonkModeNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('monk_mode');
    await Notifications.dismissNotificationAsync('monk_mode');
  } catch (error) {
    console.warn('Failed to cancel monk mode notification:', error);
  }
}

export async function scheduleMidnightReset(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('midnight_reset');
    await Notifications.scheduleNotificationAsync({
      identifier: 'midnight_reset',
      content: {
        title: '🌅 New Day, New Discipline',
        body: 'Your habits have reset. Start strong.',
        data: { type: 'reset' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 0,
        minute: 0,
        channelId: 'forgepromises_default',
      },
    });
  } catch (error) {
    console.warn('Failed to schedule midnight reset:', error);
  }
}

export async function cancelAllHabitReminders(habits: Habit[]): Promise<void> {
  await Promise.all(habits.map(h => cancelHabitReminders(h.id)));
}

export async function rescheduleAllHabitReminders(habits: Habit[]): Promise<void> {
  for (const habit of habits) {
    if (!habit.archived && (habit.reminderTimes?.length ?? 0) > 0) {
      await scheduleHabitReminder(habit);
    }
  }
}

export async function testNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'ForgePromises Test',
      body: 'Notifications are working!',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}

// Schedules 3-5 randomly-timed reminders per day (8 AM - 10 PM window) for
// a single habit. Only schedules times still in the future relative to now,
// so re-running this mid-day won't create reminders for times already
// passed. Reuses the same "habit_<id>_" identifier prefix as the old fixed
// reminders, so cancelHabitReminders() cancels these too with no changes.
export async function scheduleRandomHabitReminders(habit: Habit): Promise<void> {
  await cancelHabitReminders(habit.id);
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 inclusive
  const startHour = 8;
  const endHour = 22;
  const now = new Date();
  const times: Date[] = [];
  let attempts = 0;
  while (times.length < count && attempts < 50) {
    attempts++;
    const hour = startHour + Math.floor(Math.random() * (endHour - startHour));
    const minute = Math.floor(Math.random() * 60);
    const candidate = new Date();
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() > now.getTime()) {
      times.push(candidate);
    }
  }
  for (let i = 0; i < times.length; i++) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `habit_${habit.id}_rand_${i}`,
        content: {
          title: `${habit.emoji} ${habit.name}`,
          body: habit.description || 'Still time to knock this out today.',
          data: { habitId: habit.id },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: times[i],
          channelId: 'forgepromises_default',
        },
      });
    } catch (error) {
      console.warn(`Failed to schedule random reminder for habit ${habit.id}:`, error);
    }
  }
}

export async function scheduleRandomRemindersForAll(habits: Habit[]): Promise<void> {
  for (const habit of habits) {
    if (!habit.archived) {
      await scheduleRandomHabitReminders(habit);
    }
  }
}
