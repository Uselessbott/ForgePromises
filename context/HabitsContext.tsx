import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform, AppState, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Habit, HabitLog, AppSettings, DailyScore,
  LogStatus, LifetimeStats, WeeklyStats, MonthlyStats, DailyStats, StreakFreeze, TodayTask, Subtask,
} from './types';
import {
  formatDate, parseDate, getTodayStr, isHabitScheduledForDate,
  getWeekStart, generateId, addDays, getMonthStr, WEEKDAY_SHORT,
} from '@/utils/scheduling';
import { getCurrentStreak, getLongestStreak } from '@/utils/streaks';
import { runDailyReset } from '@/utils/dailyReset';
import * as Notifications from 'expo-notifications';
import {
  startMonkModeSession,
  syncMonkModeSession,
  stopMonkModeSession,
  getMonkModeSessionState,
} from "@/utils/monkMode";

import {
  cancelHabitReminders,
  scheduleRandomHabitReminders,
  scheduleRandomRemindersForAll,
  scheduleMidnightReset,
} from '@/utils/notifications';


const KEYS = {
  HABITS: '@fg:habits',
  LOGS: '@fg:logs',
  SETTINGS: '@fg:settings',
  FREEZES: '@fg:freezes',
  TODAY_TASKS: '@fg:today_tasks',
  DAILY_PROMISE: '@fg:daily_promise',
  PROMISE_PROGRESS: '@fg:promise_progress',
};
const PROMISE_UNLOCKS = [
  { kept: 0, limit: 3 },
  { kept: 20, limit: 4 },
  { kept: 50, limit: 5 },
  { kept: 100, limit: 6 },
  { kept: 200, limit: 7 },
  { kept: 400, limit: null },  // null = unlimited
];

const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  monkModeEnabled: false,
  notificationsEnabled: false,
  lastResetDate: '',
  lastWeeklyReviewDate: '',
  theme: 'super_amoled',
  accentColor: 'orange',
};


interface HabitsContextType {
  habits: Habit[];
  logs: HabitLog[];
  freezes: StreakFreeze[];
  settings: AppSettings;
  todayTasks: TodayTask[];
  isLoading: boolean;

  addTodayTask: (title: string) => void;
  toggleTodayTask: (id: string) => void;
  deleteTodayTask: (id: string) => void;
  createHabit: (data: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'sortOrder'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  markHabit: (habitId: string, date: string) => void;
  addSubtask: (habitId: string, title: string) => Promise<void>;
  toggleSubtask: (habitId: string, subtaskId: string, date: string) => Promise<void>;
  deleteSubtask: (habitId: string, subtaskId: string) => Promise<void>;
  renameSubtask: (
    habitId: string,
    subtaskId: string,
    newTitle: string,
  ) => Promise<void>;
  applyStreakFreeze: () => Promise<boolean>;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetAllData: () => Promise<void>;
  getHabitsForDate: (date: string) => Habit[];
  getLogForHabit: (habitId: string, date: string) => HabitLog | undefined;
  getDailyScore: (date: string) => DailyScore;
  getDailyStats: (date: string) => DailyStats;
  getStreakData: (habitId: string) => { current: number; longest: number };
  getWeeklyTargetProgress: (habitId: string, weekStart: string) => { completed: number; target: number };
  getCalendarDay: (date: string) => { color: 'none' | 'red' | 'yellow' | 'green'; completed: number; total: number; missed: number; percentage: number; streak: number };
  canUseStreakFreeze: () => boolean;
  getLifetimeStats: () => LifetimeStats;
  getWeeklyStats: (weekStart: string) => WeeklyStats;
  getMonthlyStats: (month: string) => MonthlyStats;
  getWeeklyReview: () => WeeklyStats & { summary: string };
  getLast7DaysData: () => Array<{ date: string; label: string; percentage: number; completed: number; total: number }>;
  getHabitCompletionHistory: (habitId: string, days: number) => Array<{ date: string; completed: boolean }>;
  getOverallConsistency: () => Array<{ date: string; color: 'none' | 'red' | 'yellow' | 'green' }>;
  searchHabits: (query: string) => Habit[];
  dailyPromise: { habitId: string; date: string; selectedAt: string } | null;
  selectDailyPromise: (habitId: string) => void;
  clearDailyPromise: () => void;
  hasDailyPromise: () => boolean;
  getPromisesKept: () => number;
  getTodayPromiseStats: () => { total: number; completed: number; remaining: number; completionPercent: number };
  getTodayPromiseHabits: () => Habit[];
  isDailyPromiseCompleted: () => boolean;
  getPromiseHistory: () => Array<{ date: string; habitId: string; habitName: string; emoji: string }>;
  getDailyPromise: () => Habit | undefined;
  hasCompletedAllPromisesOn: (date: string) => boolean;
  getCurrentPromiseCount: () => number;
  getPromiseLimit: () => number;
    getNextPromiseUnlock: () => { kept: number; limit: number | null } | null;
  hasUnlockedUnlimitedPromises: () => boolean;
  canCreatePromise: () => boolean;
  getPromiseProgress: () => {
    currentKept: number;
    bestKept: number;
    unlockedLevel: number;
    currentLimit: number;
    currentPromiseCount: number;
    nextUnlock: { kept: number; limit: number | null } | null;
    progress: number;
    remainingKept: number;
  };
  getPromiseTierName: () => string;
}

const HabitsContext = createContext<HabitsContextType | null>(null);

async function save(key: string, data: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}


export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [freezes, setFreezes] = useState<StreakFreeze[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  type PromiseProgress = {
  maxKept: number;
  unlockedLevel: number;
  shownDialogs: number[];
};


const [dailyPromise, setDailyPromise] = useState<{ habitId: string; date: string; selectedAt: string } | null>(null);

const [promiseProgress, setPromiseProgress] = useState<PromiseProgress>({
  maxKept: 0,
  unlockedLevel: 0,
  shownDialogs: [],
});

  const resetRanRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
const [h, l, s, f, tt] = await Promise.all([
          AsyncStorage.getItem(KEYS.HABITS),
          AsyncStorage.getItem(KEYS.LOGS),
          AsyncStorage.getItem(KEYS.SETTINGS),
          AsyncStorage.getItem(KEYS.FREEZES),
          AsyncStorage.getItem(KEYS.TODAY_TASKS),
        ]);
        const loadedHabits: Habit[] = h ? JSON.parse(h) : [];
        const loadedLogs: HabitLog[] = l ? JSON.parse(l) : [];
        const loadedSettings: AppSettings = s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
        // Migrate legacy 'dark' theme to 'super_amoled'
        if (loadedSettings.theme === 'dark' as any) {
          loadedSettings.theme = 'super_amoled' as any;
        }
        if (!(loadedSettings as any).accentColor) {
          (loadedSettings as any).accentColor = 'orange';
        }
        const loadedFreezes: StreakFreeze[] = f ? JSON.parse(f) : [];
        const loadedTodayTasks: TodayTask[] = tt ? JSON.parse(tt) : [];
        const dp = await AsyncStorage.getItem(KEYS.DAILY_PROMISE);
        const parsedDp: { habitId: string; date: string; selectedAt: string } | null = dp ? JSON.parse(dp) : null;
        if (parsedDp && parsedDp.date === getTodayStr()) {
          setDailyPromise(parsedDp);
        }
        const pp = await AsyncStorage.getItem(KEYS.PROMISE_PROGRESS);
        if (pp) {
          const parsed = JSON.parse(pp);
          setPromiseProgress({
            maxKept: parsed.maxKept ?? parsed.maxStreak ?? 0,
            unlockedLevel: parsed.unlockedLevel ?? 0,
            shownDialogs: parsed.shownDialogs ?? [],
          });
        }

        if (!resetRanRef.current) {
          resetRanRef.current = true;
          const { newLogs, updatedSettings, wasReset } = runDailyReset(loadedHabits, loadedLogs, loadedSettings);
          let finalSettings = updatedSettings;
          try {
            const permResult = await Notifications.getPermissionsAsync();
            const actuallyGranted = permResult.status === 'granted';
            if (actuallyGranted !== updatedSettings.notificationsEnabled) {
              finalSettings = { ...updatedSettings, notificationsEnabled: actuallyGranted };
            }
          } catch {}
          setHabits(loadedHabits);
          setLogs(newLogs);
          setSettings(finalSettings);
          setFreezes(loadedFreezes);
          setTodayTasks(wasReset ? [] : loadedTodayTasks);

          if (wasReset) {
            await AsyncStorage.removeItem(KEYS.TODAY_TASKS);

            setDailyPromise(null);
            await AsyncStorage.removeItem(KEYS.DAILY_PROMISE);
          }
          if (newLogs.length !== loadedLogs.length) save(KEYS.LOGS, newLogs);
          if (finalSettings !== loadedSettings) save(KEYS.SETTINGS, finalSettings);

          if (finalSettings.notificationsEnabled) {
            await scheduleRandomRemindersForAll(loadedHabits);
            await scheduleMidnightReset();
          }

          await refreshWidget(
            loadedHabits,
            newLogs,
            wasReset ? [] : loadedTodayTasks,
            finalSettings
          );
        }
      } catch {
      }
      setIsLoading(false);
    })();
  }, []);
useEffect(() => {
    if (Platform.OS !== 'android' || isLoading) return;
    const reconcile = async () => {
      try {
        const sessionState = await getMonkModeSessionState();
        const currentSettings = settings;
        if (!sessionState?.isActive) {
          // Native side may have auto-stopped the session (all habits done,
          // or it expired). Reflect that in the Profile toggle too.
          if (currentSettings.monkModeEnabled) {
            const updated = { ...settings, monkModeEnabled: false };
            setSettings(updated);
            save(KEYS.SETTINGS, updated);
          }
          return;
        }
        const { newLogs: resetLogs, updatedSettings, wasReset } =
          runDailyReset(habits, logs, settings);


        if (wasReset) {
          setLogs(resetLogs);
          setTodayTasks([]);
          await AsyncStorage.removeItem(KEYS.TODAY_TASKS);

          setDailyPromise(null);
          await AsyncStorage.removeItem(KEYS.DAILY_PROMISE);

          setSettings(updatedSettings);
          await save(KEYS.LOGS, resetLogs);
          await save(KEYS.SETTINGS, updatedSettings);
          await refreshWidget(
            habits,
            resetLogs,
            [],
            updatedSettings
          );
        }


        const today = getTodayStr();
        if (sessionState.sessionDate !== today) {
          await stopMonkModeSession();
          return;
        }
        let needsUpdate = false;
        const updatedLogs = [...resetLogs];
        sessionState.habits.forEach(habit => {
          if (!habit.completed) return;
          const exists = updatedLogs.some(
            l =>
              l.habitId === habit.id &&
              l.date === today &&
              (l.status === "completed" || l.status === "frozen")
          );
          if (!exists) {
            updatedLogs.push({
              id: generateId(),
              habitId: habit.id,
              date: today,
              status: "completed",
              completedAt: new Date().toISOString(),
            });
            needsUpdate = true;
          }
        });
        if (needsUpdate) {
          await setLogsAndSave(updatedLogs);
        }
        const scheduled = habits.filter(
          h => !h.archived && isHabitScheduledForDate(h, today)
        );
        await syncMonkModeSession(
          scheduled.map(h => ({
            id: h.id,
            name: h.name,
            completed: updatedLogs.some(
              l =>
                l.habitId === h.id &&
                l.date === today &&
                (l.status === "completed" || l.status === "frozen")
            ),
          }))
        );
      } catch {}
    };



    reconcile();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        reconcile();
      }
    });

    return () => subscription.remove();
  }, [isLoading]);


  async function refreshWidget(
    habitsOverride?: Habit[],
    logsOverride?: HabitLog[],
    todayTasksOverride?: TodayTask[],
    settingsOverride?: AppSettings
  ) {
    if (Platform.OS !== 'android') return;
    try {

    const h = habitsOverride ?? habits;
    const l = logsOverride ?? logs;
    const tt = todayTasksOverride ?? todayTasks;
    const currentSettings = settingsOverride ?? settings;
    const today = getTodayStr();
    const scheduled = h.filter(hb => !hb.archived && isHabitScheduledForDate(hb, today));
    const total = scheduled.length;

    const habitList = scheduled.map(hb => ({
      id: hb.id,
      name: hb.name,
      priority: hb.priority || 'optional',
      completed: l.some(log =>
        log.habitId === hb.id &&
        log.date === today &&
        (log.status === 'completed' || log.status === 'frozen')
      ),
    }));

    const completed = habitList.filter(hb => hb.completed).length;
    const remaining = total - completed;

    // Use the fresh h/l override values directly via getCurrentStreak,
    // NOT the local getStreakData() wrapper - that wrapper closes over the
    // component's habits/logs React state, which has not yet committed at
    // this point (refreshWidget is called synchronously right after
    // setHabits/setLogs, before React re-renders). Using the stale closure
    // here caused the streak number to disagree with the heatmap/completion
    // count, which are computed from the fresh override values below.
    let streak = 0;
    scheduled.forEach(hb => {
      const current = getCurrentStreak(hb, l);
      if (current > streak) streak = current;
    });

    const heatmapWeeks = 10;
    const heatmapDays = heatmapWeeks * 7;
    const historyStart = addDays(today, -(heatmapDays - 1));
    const history: { date: string; pct: number; hasData: boolean }[] = [];

    for (let i = 0; i < heatmapDays; i++) {
      const ds = addDays(historyStart, i);
      const scheduledForDay = h.filter(hb => !hb.archived && isHabitScheduledForDate(hb, ds));

      let totalWorkUnits = 0;
      let completedWorkUnits = 0;

      scheduledForDay.forEach(hb => {
        const log = l.find(
          lg => lg.habitId === hb.id && lg.date === ds
        );

        const work = getHabitWorkUnits(hb, log);

        totalWorkUnits += work.total;
        completedWorkUnits += work.completed;
      });

      history.push({
        date: ds,
        pct: totalWorkUnits > 0 ? completedWorkUnits / totalWorkUnits : 0,
        hasData: totalWorkUnits > 0,
      });
    }

    // Write the snapshot to native DataStore, consumed by the Glance
    // widgets. Fire-and-forget with a caught rejection: a failed snapshot
    // write should never break the React Native app.
    try {
      const promiseHabits = scheduled.filter(hb => hb.priority === PROMISE_PRIORITY);
      const promisesCompleted = promiseHabits.filter(hb =>
        habitList.find(hl => hl.id === hb.id)?.completed
      ).length;
      const promisesTotal = promiseHabits.length;

      const snapshot = {
        version: 1,
        theme: currentSettings.theme,
        accentColor: (currentSettings as any).accentColor ?? 'orange',
        updatedAt: new Date().toISOString(),
        today,
        completed,
        total,
        remaining,
        streak,
        habits: habitList,
        todayTasks: tt.map(t => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
        })),
        heatmap: history,
        promisesCompleted,
        promisesTotal,
        hasDailyPromise: hasDailyPromise(),
        selectedPromiseName: getDailyPromise()?.name,
        selectedPromiseCompleted: isDailyPromiseCompleted(),
      };
      console.log("ForgeWidget: writeSnapshot", snapshot.completed, snapshot.total, snapshot.streak);

      if (NativeModules.WidgetSnapshotModule?.writeSnapshot) {
        await NativeModules.WidgetSnapshotModule.writeSnapshot(
          JSON.stringify(snapshot)
        );
      }
    } catch (e) {
      console.warn('widget snapshot serialization failed:', e);
    }

  } catch (e) {
    console.warn('refreshWidget failed:', e);
  }

  }

  async function setHabitsAndSave(h: Habit[]) {
    setHabits(h);
    await save(KEYS.HABITS, h);
    await refreshWidget(h, logs);
  }
  async function setLogsAndSave(l: HabitLog[]) {
    setLogs(l);
    await save(KEYS.LOGS, l);
    await refreshWidget(habits, l);
  }
  async function setSettingsAndSave(s: AppSettings) {
    console.log("SAVE SETTINGS", s);
    setSettings(s);
    await save(KEYS.SETTINGS, s);
    await refreshWidget(habits, logs, todayTasks, s);
  }
  function setFreezesAndSave(f: StreakFreeze[]) { setFreezes(f); save(KEYS.FREEZES, f); }

  async function setTodayTasksAndSave(tasks: TodayTask[]) {
    setTodayTasks(tasks);
    await save(KEYS.TODAY_TASKS, tasks);
    await refreshWidget(habits, logs, tasks);
  }

  async function createHabit(data: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'sortOrder'>) {
    if ((data.priority || 'optional') === PROMISE_PRIORITY && !canCreatePromise()) {
      Alert.alert(
        'Promise limit reached',
        'Complete more Promises to unlock additional Promise slots.'
      );
      return;
    }

    const h: Habit = {
      ...data,
      priority: data.priority || 'optional',
      id: generateId(),
      createdAt: getTodayStr(),
      archived: false,
      sortOrder: habits.length,
    };
    await setHabitsAndSave([...habits, h]);

    if (settings.notificationsEnabled) {
      await scheduleRandomHabitReminders(h);
    }
  }

  async function updateHabit(id: string, updates: Partial<Habit>) {
    const updatedHabit = habits.find(h => h.id === id);

    if (
      updates.priority === PROMISE_PRIORITY &&
      updatedHabit &&
      updatedHabit.priority !== PROMISE_PRIORITY &&
      !canCreatePromise()
    ) {
      Alert.alert(
        'Promise limit reached',
        'Complete more Promises to unlock additional Promise slots.'
      );
      return;
    }

    const merged = updatedHabit ? { ...updatedHabit, ...updates } : null;

    await setHabitsAndSave(
      habits.map(h => h.id === id ? { ...h, ...updates } : h)
    );

    if (merged) {
      await cancelHabitReminders(id);
      if (!merged.archived && settings.notificationsEnabled) {
        await scheduleRandomHabitReminders(merged);
      }
    }
}

  async function deleteHabit(id: string) {
    const newHabits = habits.filter(h => h.id !== id);
    const newLogs = logs.filter(l => l.habitId !== id);

    setHabits(newHabits);
    setLogs(newLogs);
    setFreezesAndSave(freezes.filter(f => f.habitId !== id));

    await save(KEYS.HABITS, newHabits);
    await save(KEYS.LOGS, newLogs);

    await refreshWidget(newHabits, newLogs);
    await cancelHabitReminders(id);
  }

  async function archiveHabit(id: string) { await updateHabit(id, { archived: true }); }
  async function restoreHabit(id: string) { await updateHabit(id, { archived: false }); }






  async function markHabit(habitId: string, date: string) {
    const today = getTodayStr();
    if (date != today) return;

    const habit = habits.find(h => h.id === habitId);
    if (habit?.subtasks?.length) {
      // Habits with subtasks are completed through subtask toggles.
      return;
    }
    let newLogs: HabitLog[];
    const existing = logs.find(
      l => l.habitId === habitId && l.date === date
    );
    if (existing?.status === 'completed') {
      newLogs = logs.filter(
        l => !(l.habitId === habitId && l.date === date)
      );
    } else {
      newLogs = [
        ...logs,
        {
          id: generateId(),
          habitId,
          date,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
      ];
      await cancelHabitReminders(habitId);
    }
    await setLogsAndSave(newLogs);
    if (settings.monkModeEnabled) {
      const scheduled = habits.filter(
        h => !h.archived && isHabitScheduledForDate(h, today)
      );
      const habitData = scheduled.map(h => ({
        id: h.id,
        name: h.name,
        completed: newLogs.some(
          l =>
            l.habitId === h.id &&
            l.date === today &&
            (l.status === 'completed' || l.status === 'frozen')
        ),
      }));
      syncMonkModeSession(habitData).catch(() => {});
    }
  }

  async function addSubtask(habitId: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const newSubtask: Subtask = {
      id: generateId(),
      title: trimmed,
    };

    const updatedHabits = habits.map(h =>
      h.id === habitId
        ? {
            ...h,
            subtasks: [...(h.subtasks ?? []), newSubtask],
          }
        : h
    );

    await setHabitsAndSave(updatedHabits);
  }

  async function toggleSubtask(habitId: string, subtaskId: string, date: string) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || !habit.subtasks?.length) return;

    const existingLog = logs.find(
      l => l.habitId === habitId && l.date === date
    );

    const completed = [...(existingLog?.completedSubtasks ?? [])];

    const idx = completed.indexOf(subtaskId);
    if (idx >= 0) {
      completed.splice(idx, 1);
    } else {
      completed.push(subtaskId);
    }

    let newLogs = [...logs];

    // Nothing checked anymore -> remove today's log
    if (completed.length === 0) {
      newLogs = newLogs.filter(
        l => !(l.habitId === habitId && l.date === date)
      );
      await setLogsAndSave(newLogs);
      return;
    }

    const finished = completed.length === habit.subtasks.length;

    if (existingLog) {
      newLogs = newLogs.map(l =>
        l.habitId === habitId && l.date === date
          ? {
              ...l,
              status: finished ? 'completed' : 'in_progress',
              completedSubtasks: completed,
              completedAt: finished ? new Date().toISOString() : undefined,
            }
          : l
      );
    } else {
      newLogs.push({
        id: generateId(),
        habitId,
        date,
        status: finished ? 'completed' : 'in_progress',
        completedAt: finished ? new Date().toISOString() : undefined,
        completedSubtasks: completed,
      });
    }

    await setLogsAndSave(newLogs);
}

  async function deleteSubtask(habitId: string, subtaskId: string) {
    const updatedHabits = habits.map(h => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        subtasks: (h.subtasks ?? []).filter(st => st.id !== subtaskId),
      };
    });

    const updatedHabit = updatedHabits.find(h => h.id === habitId);

    let updatedLogs = logs
      .map(log => {
        if (log.habitId !== habitId) return log;

        const completed = (log.completedSubtasks ?? []).filter(
          id => id !== subtaskId
        );

        if (completed.length === 0) {
          return null;
        }

        const allDone =
          (updatedHabit?.subtasks?.length ?? 0) > 0 &&
          updatedHabit!.subtasks!.every(st => completed.includes(st.id));

        return {
          ...log,
          completedSubtasks: completed,
          status: allDone ? 'completed' : 'in_progress',
          completedAt: allDone ? log.completedAt : undefined,
        };
      })
      .filter((x): x is HabitLog => x !== null);

    await setHabitsAndSave(updatedHabits);
    await setLogsAndSave(updatedLogs);
}


  async function renameSubtask(
    habitId: string,
    subtaskId: string,
    newTitle: string,
  ) {
    if (!newTitle.trim()) return;

    const updatedHabits = habits.map(h => {
      if (h.id !== habitId) return h;

      return {
        ...h,
        subtasks: (h.subtasks ?? []).map(st =>
          st.id === subtaskId
            ? { ...st, title: newTitle.trim() }
            : st
        ),
      };
    });

    await setHabitsAndSave(updatedHabits);
  }

  async function addTodayTask(title: string) {
    if (!title.trim()) return;
    await setTodayTasksAndSave([
      ...todayTasks,
      {
        id: generateId(),
        title: title.trim(),
        completed: false,
        createdAt: getTodayStr(),
      },
    ]);
  }

  async function toggleTodayTask(id: string) {
    await setTodayTasksAndSave(
      todayTasks.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  }

  async function deleteTodayTask(id: string) {
    await setTodayTasksAndSave(
      todayTasks.filter(t => t.id !== id)
    );
  }

  function canUseStreakFreeze(): boolean {
    const month = getMonthStr(getTodayStr());
    return !freezes.some(f => f.month === month);
  }

  async function applyStreakFreeze(): Promise<boolean> {
    if (!canUseStreakFreeze()) return false;
    const month = getMonthStr(getTodayStr());
    const today = getTodayStr();
    const habitsToday = habits.filter(h => !h.archived && isHabitScheduledForDate(h, today));
    const newLogs = [...logs];
    habitsToday.forEach(h => {
      const existing = newLogs.find(l => l.habitId === h.id && l.date === today);
      if (!existing) {
        newLogs.push({ id: generateId(), habitId: h.id, date: today, status: 'frozen' });
      }
    });
    await setLogsAndSave(newLogs);
    const newFreezes: StreakFreeze[] = [...freezes, { habitId: 'global', month, usedDate: today }];
    setFreezesAndSave(newFreezes);
    return true;
  }


  const PROMISE_PRIORITY = 'promise';

  function selectDailyPromise(habitId: string) {
    const today = getTodayStr();

    if (hasDailyPromise()) return;

    const habit = habits.find(h => h.id === habitId);

    if (!habit) return;
    if (habit.priority !== PROMISE_PRIORITY) return;
    if (!isHabitScheduledForDate(habit, today)) return;

    const dp = {
      habitId,
      date: today,
      selectedAt: new Date().toISOString(),
    };

    setDailyPromise(dp);
    save(KEYS.DAILY_PROMISE, dp);
  }

  function clearDailyPromise() {
    setDailyPromise(null);
    save(KEYS.DAILY_PROMISE, null);
  }

  function hasDailyPromise(): boolean {
    return !!dailyPromise && dailyPromise.date === getTodayStr();
  }

  function getPromisesKept(): number {
    const promiseHabitIds = new Set(habits.filter(h => h.priority === PROMISE_PRIORITY).map(h => h.id));
    const completedSet = new Set<string>();
    for (const l of logs) {
      if (l.status === 'completed' && promiseHabitIds.has(l.habitId)) {
        completedSet.add(`${l.habitId}_${l.date}`);
      }
    }
    return completedSet.size;
  }

  function getTodayPromiseStats(): { total: number; completed: number; remaining: number; completionPercent: number } {
    const today = getTodayStr();
    const promises = getHabitsForDate(today).filter(h => h.priority === PROMISE_PRIORITY);
    const completed = promises.filter(h => {
      const log = getLogForHabit(h.id, today);
      return log?.status === 'completed';
    }).length;
    const total = promises.length;
    const remaining = total - completed;
    const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, remaining, completionPercent };
  }

  function getTodayPromiseHabits(): Habit[] {
    return getHabitsForDate(getTodayStr()).filter(h => h.priority === PROMISE_PRIORITY);
  }

  function isDailyPromiseCompleted(): boolean {
    const today = getTodayStr();
    if (!dailyPromise || dailyPromise.date !== today) return false;
    const log = getLogForHabit(dailyPromise.habitId, today);
    return log?.status === 'completed';
  }

  function getPromiseHistory(): Array<{
    date: string;
    habitId: string;
    habitName: string;
    emoji: string;
    status: 'completed' | 'missed';
  }> {
    const promiseHabitIds = new Set(
      habits
        .filter(h => h.priority === PROMISE_PRIORITY)
        .map(h => h.id)
    );

    const promiseLogs = logs
      .filter(
        l =>
          promiseHabitIds.has(l.habitId) &&
          (l.status === 'completed' || l.status === 'missed')
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return promiseLogs.map(l => {
      const habit = habits.find(h => h.id === l.habitId);

      return {
        date: l.date,
        habitId: l.habitId,
        habitName: habit?.name ?? 'Unknown Promise',
        emoji: habit?.emoji ?? '❤️',
        status: l.status as 'completed' | 'missed',
      };
    });
  }

  function getDailyPromise(): Habit | undefined {
    if (!hasDailyPromise()) return undefined;
    return habits.find(h => h.id === dailyPromise!.habitId && h.priority === PROMISE_PRIORITY);
  }


  function hasCompletedAllPromisesOn(date: string): boolean {
    const promises = getHabitsForDate(date).filter(h => h.priority === PROMISE_PRIORITY);
    if (promises.length === 0) return false;
    return promises.every(h => {
      const log = getLogForHabit(h.id, date);
      return log?.status === 'completed';
    });
  }


  function getCurrentPromiseCount(): number {
    return habits.filter(h => h.priority === PROMISE_PRIORITY && !h.archived).length;
  }

  function getPromiseLimit(): number {
    const tier = PROMISE_UNLOCKS[promiseProgress.unlockedLevel];
    return tier ? (tier.limit ?? Infinity) : 3;
  }

  function getNextPromiseUnlock(): { kept: number; limit: number | null } | null {
    const next = PROMISE_UNLOCKS[promiseProgress.unlockedLevel + 1];
    if (!next) return null;
    return { kept: next.kept, limit: next.limit };
  }

  function hasUnlockedUnlimitedPromises(): boolean {
    return promiseProgress.unlockedLevel >= PROMISE_UNLOCKS.length - 1;
  }

  function canCreatePromise(): boolean {
    if (hasUnlockedUnlimitedPromises()) return true;
    return getCurrentPromiseCount() < getPromiseLimit();
  }

  function getPromiseProgress(): {
    currentKept: number;
    bestKept: number;
    unlockedLevel: number;
    currentLimit: number;
    currentPromiseCount: number;
    nextUnlock: { kept: number; limit: number | null } | null;
    progress: number;
    remainingKept: number;
  } {
    const currentKept = getPromisesKept();
    const bestKept = promiseProgress.maxKept;
    const unlockedLevel = promiseProgress.unlockedLevel;
    const currentLimit = getPromiseLimit();
    const currentPromiseCount = getCurrentPromiseCount();
    const nextUnlock = getNextPromiseUnlock();

    const currentTier = PROMISE_UNLOCKS[unlockedLevel] ?? PROMISE_UNLOCKS[0];
    const milestoneStart = currentTier.kept;

    let progress = 100;
    let remainingKept = 0;
    if (nextUnlock) {
      const milestoneEnd = nextUnlock.kept;
      progress = milestoneEnd > milestoneStart
        ? Math.min(100, Math.round(((currentKept - milestoneStart) / (milestoneEnd - milestoneStart)) * 100))
        : 100;
      remainingKept = Math.max(0, milestoneEnd - currentKept);
    }
    return {
      currentKept,
      bestKept,
      unlockedLevel,
      currentLimit,
      currentPromiseCount,
      nextUnlock,
      progress,
      remainingKept,
    };
  }

  function getPromiseTierName(): string {
    switch (promiseProgress.unlockedLevel) {
      case 0: return 'Beginner';
      case 1: return 'Disciplined';
      case 2: return 'Committed';
      case 3: return 'Master';
      default: return 'Beginner';
    }
  }

  function updateSettings(updates: Partial<AppSettings>) {
    const ns = { ...settings, ...updates };
    console.log(
      "UPDATE SETTINGS",
      "current=", settings,
      "updates=", updates,
      "next=", ns
    );
    setSettingsAndSave(ns);
    if (updates.monkModeEnabled === true) {
      const today = getTodayStr();
      const scheduled = habits.filter(
        h => !h.archived && isHabitScheduledForDate(h, today)
      );
      const habitData = scheduled.map(h => ({
        id: h.id,
        name: h.name,
        completed: logs.some(
          l =>
            l.habitId === h.id &&
            l.date === today &&
            (l.status === 'completed' || l.status === 'frozen')
        ),
      }));
      startMonkModeSession(habitData).catch(() => {});
    }
    if (updates.monkModeEnabled === false) {
      stopMonkModeSession().catch(() => {});
    }
  }

  async function resetAllData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.HABITS),
      AsyncStorage.removeItem(KEYS.LOGS),
      AsyncStorage.removeItem(KEYS.SETTINGS),
      AsyncStorage.removeItem(KEYS.FREEZES),
    ]);
    setHabits([]);
    setLogs([]);
    setSettings(DEFAULT_SETTINGS);
    setFreezes([]);
    // Bug fix: this previously referenced loadedHabits/newLogs, which don't
    // exist in this function's scope at all (they belong to the cold-start
    // useEffect elsewhere in this file) - that would throw a ReferenceError
    // every time resetAllData() ran, crashing before the widget ever
    // refreshed. Pass the actual freshly-reset empty arrays instead.
  }

  function getHabitsForDate(date: string): Habit[] {
    console.log("========== getHabitsForDate ==========");
    console.log("Date:", date);
    console.log("Habits count:", habits.length);

    habits.forEach(h => {
      const scheduled = isHabitScheduledForDate(h, date);
      console.log({
        id: h.id,
        name: h.name,
        frequency: h.frequency,
        createdAt: h.createdAt,
        archived: h.archived,
        scheduled,
        habit: h,
      });
    });

    const filtered = habits.filter(
      h => !h.archived && isHabitScheduledForDate(h, date)
    );

    console.log("Today's habits:", filtered.length);
    console.log(filtered);
    console.log("======================================");

    return filtered;
  }

  function getLogForHabit(habitId: string, date: string): HabitLog | undefined {
    return logs.find(l => l.habitId === habitId && l.date === date);
  }

  function getDailyScore(date: string): DailyScore {
    const scheduled = getHabitsForDate(date);
    if (scheduled.length === 0) return { completed: 0, total: 0, percentage: 0, missed: 0 };
    const completed = scheduled.filter(h => getLogForHabit(h.id, date)?.status === 'completed').length;
    const missed = scheduled.filter(h => {
      const log = getLogForHabit(h.id, date);
      return log?.status === 'missed' || (date < getTodayStr() && !log);
    }).length;
    return { completed, total: scheduled.length, percentage: Math.round((completed / scheduled.length) * 100), missed };
  }

  function getDailyStats(date: string): DailyStats {
    const score = getDailyScore(date);
    const today = getTodayStr();
    return {
      date,
      total: score.total,
      completed: score.completed,
      missed: score.missed,
      completionPercent: score.percentage,
      dailyScore: score.total > 0 ? Math.round((score.completed / score.total) * 100) : 0,
      isLocked: date < today,
    };
  }

  function getStreakData(habitId: string): { current: number; longest: number } {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return { current: 0, longest: 0 };
    return { current: getCurrentStreak(habit, logs), longest: getLongestStreak(habit, logs) };
  }

  function getWeeklyTargetProgress(habitId: string, weekStart: string): { completed: number; target: number } {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || habit.frequency !== 'weekly_target') return { completed: 0, target: 0 };
    let completed = 0;
    const ws = parseDate(weekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      const ds = formatDate(d);
      if (getLogForHabit(habitId, ds)?.status === 'completed') completed++;
    }
    return { completed, target: habit.weeklyTarget ?? 0 };
  }

  function getHabitWorkUnits(habit: Habit, log: HabitLog | undefined): { completed: number; total: number } {
    if (!habit.subtasks || habit.subtasks.length === 0) {
      return {
        completed: (log?.status === 'completed' || log?.status === 'frozen') ? 1 : 0,
        total: 1,
      };
    }

    const completedCount = habit.subtasks.filter(st =>
      log?.completedSubtasks?.includes(st.id)
    ).length;

    return {
      completed: completedCount,
      total: habit.subtasks.length,
    };
  }

  function getCalendarDay(date: string) {
    const today = getTodayStr();
    if (date > today) return { color: 'none' as const, completed: 0, total: 0, missed: 0, percentage: 0, streak: 0 };
    const scheduled = getHabitsForDate(date);
    if (scheduled.length === 0) return { color: 'none' as const, completed: 0, total: 0, missed: 0, percentage: 0, streak: 0 };
    const completed = scheduled.filter(h => {
      const log = getLogForHabit(h.id, date);
      return log?.status === 'completed' || log?.status === 'frozen';
    }).length;

    const missed = scheduled.length - completed;

    let totalWorkUnits = 0;
    let completedWorkUnits = 0;

    scheduled.forEach(h => {
      const log = getLogForHabit(h.id, date);
      const work = getHabitWorkUnits(h, log);

      totalWorkUnits += work.total;
      completedWorkUnits += work.completed;
    });

    const percentage =
      totalWorkUnits > 0
        ? Math.round((completedWorkUnits / totalWorkUnits) * 100)
        : 0;

    const color =
      completed === 0
        ? 'red' as const
        : completed < scheduled.length
        ? 'yellow' as const
        : 'green' as const;

    const streak = scheduled.reduce(
      (max, h) => Math.max(max, getCurrentStreak(h, logs)),
      0
    );

    return {
      color,
      completed,
      total: scheduled.length,
      missed,
      percentage,
      streak,
    };
  }

  function getLifetimeStats(): LifetimeStats {
    const activeHabits = habits.filter(h => !h.archived);
    const allScheduledLogs = logs.filter(l => l.status !== 'missed');
    const totalCompleted = logs.filter(l => l.status === 'completed').length;
    const totalMissed = logs.filter(l => l.status === 'missed').length;
    const totalScheduled = totalCompleted + totalMissed + logs.filter(l => l.status === 'frozen').length;
    const longestEverStreak = activeHabits.reduce((max, h) => Math.max(max, getLongestStreak(h, logs)), 0);
    const currentBestStreak = activeHabits.reduce((max, h) => Math.max(max, getCurrentStreak(h, logs)), 0);
    const activeDays = new Set(allScheduledLogs.map(l => l.date)).size;
    return {
      totalCompleted,
      totalMissed,
      totalScheduled,
      overallCompletion: totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0,
      longestEverStreak,
      currentBestStreak,
      activeDays,
      habitsCreated: habits.length,
    };
  }

  function getWeeklyStats(weekStart: string): WeeklyStats {
    const weekEnd = addDays(weekStart, 6);
    const activeHabits = habits.filter(h => !h.archived);
    let totalScheduled = 0, completed = 0, missed = 0;
    const habitCompletions: Record<string, number> = {};
    const habitScheduled: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      activeHabits.forEach(h => {
        if (isHabitScheduledForDate(h, date)) {
          totalScheduled++;
          habitScheduled[h.id] = (habitScheduled[h.id] || 0) + 1;
          const log = getLogForHabit(h.id, date);
          if (log?.status === 'completed') { completed++; habitCompletions[h.id] = (habitCompletions[h.id] || 0) + 1; }
          else if (log?.status === 'missed') missed++;
        }
      });
    }
    const sortedByCompletion = Object.keys(habitCompletions).sort((a, b) => {
      const rateA = (habitCompletions[a] || 0) / (habitScheduled[a] || 1);
      const rateB = (habitCompletions[b] || 0) / (habitScheduled[b] || 1);
      return rateB - rateA;
    });
    const longestStreak = activeHabits.reduce((max, h) => Math.max(max, getLongestStreak(h, logs)), 0);
    return {
      weekStart,
      weekEnd,
      totalScheduled,
      completed,
      missed,
      completionPercent: totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0,
      bestHabitId: sortedByCompletion[0] || '',
      worstHabitId: sortedByCompletion[sortedByCompletion.length - 1] || '',
      longestStreak,
      averageCompletion: activeHabits.length > 0
        ? Math.round(Object.values(habitCompletions).reduce((s, v) => s + v, 0) / activeHabits.length)
        : 0,
    };
  }

  function getMonthlyStats(month: string): MonthlyStats {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const activeHabits = habits.filter(h => !h.archived);
    let totalScheduled = 0, completed = 0, missed = 0;
    const habitCompletions: Record<string, number> = {};
    const habitScheduled: Record<string, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      activeHabits.forEach(h => {
        if (isHabitScheduledForDate(h, date)) {
          totalScheduled++;
          habitScheduled[h.id] = (habitScheduled[h.id] || 0) + 1;
          const log = getLogForHabit(h.id, date);
          if (log?.status === 'completed') { completed++; habitCompletions[h.id] = (habitCompletions[h.id] || 0) + 1; }
          else if (log?.status === 'missed') missed++;
        }
      });
    }
    const sortedByRate = Object.keys(habitScheduled).sort((a, b) => {
      const rateA = (habitCompletions[a] || 0) / (habitScheduled[a] || 1);
      const rateB = (habitCompletions[b] || 0) / (habitScheduled[b] || 1);
      return rateB - rateA;
    });
    return {
      month,
      totalScheduled,
      completed,
      missed,
      completionPercent: totalScheduled > 0 ? Math.round((completed / totalScheduled) * 100) : 0,
      mostConsistentHabitId: sortedByRate[0] || '',
      leastConsistentHabitId: sortedByRate[sortedByRate.length - 1] || '',
    };
  }

  function getWeeklyReview(): WeeklyStats & { summary: string } {
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay() - 7);
    const weekStart = formatDate(lastSunday);
    const stats = getWeeklyStats(weekStart);
    const { completionPercent } = stats;
    let summary = '';
    if (completionPercent >= 90) summary = 'Outstanding week! You showed up when it mattered.';
    else if (completionPercent >= 70) summary = 'Solid effort this week. Keep the momentum.';
    else if (completionPercent >= 50) summary = 'You made progress. Next week, push harder.';
    else summary = 'Rough week. Reset and recommit. Tomorrow starts now.';
    return { ...stats, summary };
  }

  function getLast7DaysData() {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(getTodayStr(), i - 6);
      const score = getDailyScore(date);
      const d = parseDate(date);
      return {
        date,
        label: WEEKDAY_SHORT[d.getDay()],
        percentage: score.percentage,
        completed: score.completed,
        total: score.total,
      };
    });
  }

  function getHabitCompletionHistory(habitId: string, days: number) {
    const today = getTodayStr();
    return Array.from({ length: days }, (_, i) => {
      const date = addDays(today, i - days + 1);
      const log = getLogForHabit(habitId, date);
      return { date, completed: log?.status === 'completed' || log?.status === 'frozen' };
    });
  }

  function getOverallConsistency() {
    const today = getTodayStr();
    return Array.from({ length: 90 }, (_, i) => {
      const date = addDays(today, i - 89);
      const { color } = getCalendarDay(date);
      return { date, color };
    });
  }

  function searchHabits(query: string): Habit[] {
    if (!query.trim()) return habits.filter(h => !h.archived);
    const q = query.toLowerCase();
    return habits.filter(h =>
      !h.archived && (
        h.name.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.notes?.toLowerCase().includes(q)
      ),
    );
  }

  return (
    <HabitsContext.Provider value={{
habits, logs, freezes, settings,
      todayTasks,
      isLoading,
      createHabit, updateHabit, deleteHabit, archiveHabit, restoreHabit,
      markHabit,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      renameSubtask,
      applyStreakFreeze,
      updateSettings,
      resetAllData,
      getHabitsForDate, getLogForHabit, getDailyScore, getDailyStats,
      getStreakData, getWeeklyTargetProgress, getCalendarDay, canUseStreakFreeze,
      getLifetimeStats, getWeeklyStats, getMonthlyStats, getWeeklyReview,
      getLast7DaysData,
      getHabitCompletionHistory,
      getOverallConsistency,
      searchHabits,

        dailyPromise,
        selectDailyPromise,
        clearDailyPromise,
        hasDailyPromise,
        getDailyPromise,
        isDailyPromiseCompleted,
        getTodayPromiseHabits,
        getTodayPromiseStats,
        getPromisesKept,
        getPromiseHistory,
        hasCompletedAllPromisesOn,
        getCurrentPromiseCount,
        getPromiseLimit,
        getNextPromiseUnlock,
        hasUnlockedUnlimitedPromises,
        canCreatePromise,
        getPromiseProgress,
        getPromiseTierName,

      addTodayTask,
      toggleTodayTask,
      deleteTodayTask,
    }}>
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits(): HabitsContextType {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be used within HabitsProvider');
  return ctx;
}