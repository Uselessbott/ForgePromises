import { Habit } from '@/context/types';

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getTodayStr(): string {
  return formatDate(new Date());
}

export function getWeekStart(dateStr: string): string {
  const date = parseDate(dateStr);
  const dayOfWeek = date.getDay();
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - dayOfWeek);
  return formatDate(weekStart);
}

export function getMonthStr(dateStr: string): string {
  return dateStr.substring(0, 7);
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function isHabitScheduledForDate(habit: Habit, dateStr: string): boolean {
  if (habit.archived) return false;

  const date = parseDate(dateStr);
  const createdDate = parseDate(habit.createdAt);

  if (date < createdDate) return false;
  if (!isWithinRepetitionBounds(habit, date, createdDate)) return false;

  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return (habit.weekdays ?? []).includes(dayOfWeek);
    case 'weekly_target':
      return true;
    case 'monthly':
      return (habit.monthlyDates ?? []).includes(dayOfMonth);
    default:
      return false;
  }
}

function isWithinRepetitionBounds(habit: Habit, date: Date, created: Date): boolean {
  const { repetition } = habit;
  if (!repetition || repetition.type === 'forever') return true;

  switch (repetition.type) {
    case 'days': {
      const end = new Date(created);
      end.setDate(end.getDate() + (repetition.count ?? 0) - 1);
      return date <= end;
    }
    case 'weeks': {
      const end = new Date(created);
      end.setDate(end.getDate() + (repetition.count ?? 0) * 7 - 1);
      return date <= end;
    }
    case 'months': {
      const end = new Date(created);
      end.setMonth(end.getMonth() + (repetition.count ?? 0));
      end.setDate(end.getDate() - 1);
      return date <= end;
    }
    case 'until_date': {
      if (!repetition.endDate) return true;
      const endDate = parseDate(repetition.endDate);
      return date <= endDate;
    }
    default:
      return true;
  }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
