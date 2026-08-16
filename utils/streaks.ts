import { Habit, HabitLog } from '@/context/types';
import { formatDate, parseDate, getTodayStr, isHabitScheduledForDate } from './scheduling';

export function getCurrentStreak(habit: Habit, logs: HabitLog[]): number {
  const today = getTodayStr();
  const todayDate = parseDate(today);
  const createdDate = parseDate(habit.createdAt);

  let streak = 0;
  const checkDate = new Date(todayDate);
  let attempts = 0;

  while (attempts < 365 * 3) {
    if (checkDate < createdDate) break;

    const dateStr = formatDate(checkDate);

    if (!isHabitScheduledForDate(habit, dateStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      attempts++;
      continue;
    }

    const log = logs.find(l => l.habitId === habit.id && l.date === dateStr);

    if (!log) {
      if (dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
        attempts++;
        continue;
      }
      break;
    }

    if (log.status === 'completed' || log.status === 'frozen') {
      streak++;
    } else {
      break;
    }

    checkDate.setDate(checkDate.getDate() - 1);
    attempts++;
  }

  return streak;
}

export function getLongestStreak(habit: Habit, logs: HabitLog[]): number {
  const today = getTodayStr();
  const createdDate = parseDate(habit.createdAt);
  const todayDate = parseDate(today);

  let longest = 0;
  let current = 0;
  const checkDate = new Date(createdDate);

  while (checkDate <= todayDate) {
    const dateStr = formatDate(checkDate);

    if (!isHabitScheduledForDate(habit, dateStr)) {
      checkDate.setDate(checkDate.getDate() + 1);
      continue;
    }

    const log = logs.find(l => l.habitId === habit.id && l.date === dateStr);

    if (log && (log.status === 'completed' || log.status === 'frozen')) {
      current++;
      if (current > longest) longest = current;
    } else if (dateStr < today) {
      current = 0;
    }

    checkDate.setDate(checkDate.getDate() + 1);
  }

  return longest;
}
