import 'expo-router/entry';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isScheduledToday(habit: any, today: string): boolean {
  if (habit.archived) return false;
  const date = parseDate(today);
  const created = parseDate(habit.createdAt);
  if (date < created) return false;

  const dow = date.getDay();
  const dom = date.getDate();
  switch (habit.frequency) {
    case 'daily': return true;
    case 'weekly': return (habit.weekdays ?? []).includes(dow);
    case 'weekly_target': return true;
    case 'monthly': return (habit.monthlyDates ?? []).includes(dom);
    default: return false;
  }
}

function getBestStreakToday(habits: any[], logs: any[], today: string): number {
  let best = 0;
  for (const habit of habits) {
    if (habit.archived) continue;
    let streak = 0;
    const cursor = new Date(parseDate(today));
    let attempts = 0;
    while (attempts < 365) {
      const ds = cursor.toISOString().split('T')[0];
      if (!isScheduledToday(habit, ds)) {
        cursor.setDate(cursor.getDate() - 1);
        attempts++;
        continue;
      }
      const log = logs.find((l: any) => l.habitId === habit.id && l.date === ds);
      if (!log) break;
      if (log.status === 'completed' || log.status === 'frozen') {
        streak++;
      } else {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
      attempts++;
    }
    if (streak > best) best = streak;
  }
  return best;
}

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function toggleHabitCompletion(habitId: string): Promise<void> {
  const today = getTodayStr();
  const rawLogs = await AsyncStorage.getItem('@fg:logs');
  const logs: any[] = rawLogs ? JSON.parse(rawLogs) : [];

  const existingIndex = logs.findIndex(
    (l: any) => l.habitId === habitId && l.date === today
  );

  let updatedLogs: any[];
  if (existingIndex >= 0 && logs[existingIndex].status === 'completed') {
    updatedLogs = logs.filter((_: any, i: number) => i !== existingIndex);
  } else if (existingIndex >= 0) {
    updatedLogs = logs.map((l: any, i: number) =>
      i === existingIndex
        ? { ...l, status: 'completed', completedAt: new Date().toISOString() }
        : l
    );
  } else {
    updatedLogs = [
      ...logs,
      {
        id: generateLogId(),
        habitId,
        date: today,
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
    ];
  }

  await AsyncStorage.setItem('@fg:logs', JSON.stringify(updatedLogs));
}

function buildHeatmapHistory(habits: any[], logs: any[], today: string, weeks: number) {
  const totalDays = weeks * 7;
  const history: { date: string; pct: number; hasData: boolean }[] = [];
  const cursor = parseDate(today);
  cursor.setDate(cursor.getDate() - (totalDays - 1));

  for (let i = 0; i < totalDays; i++) {
    const ds = formatDateStr(cursor);
    const scheduled = habits.filter((h: any) => isScheduledToday(h, ds));
    const total = scheduled.length;
    const completedCount = scheduled.filter((h: any) =>
      logs.some((l: any) =>
        l.habitId === h.id && l.date === ds && (l.status === 'completed' || l.status === 'frozen')
      )
    ).length;
    const pct = total > 0 ? completedCount / total : 0;
    history.push({ date: ds, pct, hasData: total > 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return history;
}

const ALL_WIDGET_NAMES = ['ForgePromisesProgress', 'ForgePromisesTasks', 'ForgePromisesCombined', 'ForgePromisesHeatmap'];

function widgetTypeFor(widgetName: string): 'progress' | 'tasks' | 'combined' | 'heatmap' {
  if (widgetName === 'ForgePromisesProgress') return 'progress';
  if (widgetName === 'ForgePromisesTasks') return 'tasks';
  if (widgetName === 'ForgePromisesHeatmap') return 'heatmap';
  return 'combined';
}
