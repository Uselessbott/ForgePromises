import { Habit, HabitLog, AppSettings } from '@/context/types';
import {
  getTodayStr, formatDate, parseDate, isHabitScheduledForDate, generateId,
} from './scheduling';

export function runDailyReset(
  habits: Habit[],
  logs: HabitLog[],
  settings: AppSettings,
): { newLogs: HabitLog[]; updatedSettings: AppSettings; wasReset: boolean } {
  const today = getTodayStr();
  const lastReset = settings.lastResetDate;

  if (lastReset === today) {
    return { newLogs: logs, updatedSettings: settings, wasReset: false };
  }

  const yesterday = formatDate(new Date(parseDate(today).setDate(parseDate(today).getDate() - 1)));
  const dateToProcess = lastReset || yesterday;

  const processDate = parseDate(dateToProcess);
  const todayDate = parseDate(today);
  const newLogs = [...logs];

  const cursor = new Date(processDate);
  while (cursor < todayDate) {
    const dateStr = formatDate(cursor);
    const scheduled = habits.filter(h => !h.archived && isHabitScheduledForDate(h, dateStr));
    for (const habit of scheduled) {
      const existing = newLogs.find(l => l.habitId === habit.id && l.date === dateStr);
      if (!existing) {
        newLogs.push({
          id: generateId(),
          habitId: habit.id,
          date: dateStr,
          status: 'missed',
        });
      } else if (existing.status === 'in_progress') {
        existing.status = 'missed';
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const updatedSettings: AppSettings = { ...settings, lastResetDate: today };
  return { newLogs, updatedSettings, wasReset: true };
}

export function shouldShowWeeklyReview(settings: AppSettings): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();
  if (dayOfWeek !== 0) return false;
  const todayStr = getTodayStr();
  return settings.lastWeeklyReviewDate !== todayStr;
}

export function getStreakFreezeMonth(): string {
  return getTodayStr().substring(0, 7);
}
