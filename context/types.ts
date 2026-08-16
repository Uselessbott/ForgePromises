export type LogStatus = 'completed' | 'missed' | 'frozen' | 'in_progress';

export type HabitFrequency =
  | 'daily'
  | 'weekly'
  | 'weekly_target'
  | 'specific_days'
  | 'monthly';

export type Priority = 'promise' | 'important' | 'optional';
export type RepetitionType =
  | 'forever'
  | 'days'
  | 'weeks'
  | 'months'
  | 'until_date';

export interface Repetition {
  type: RepetitionType;
  count?: number;
  endDate?: string;
}

export interface Subtask {
  id: string;
  title: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  emoji?: string;

  priority?: Priority; // defaults to optional
  createdAt: string;
  archived: boolean;
  sortOrder: number;

  frequency: HabitFrequency;

  weeklyTarget?: number;

  // Old schema
  scheduleDays?: number[];
  reminderTime?: string;

  // New schema
  weekdays?: number[];
  monthlyDates?: number[];
  reminderTimes?: string[];
  repetition?: Repetition;

  color?: string;
  subtasks?: Subtask[];
}


export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  status: LogStatus;
  completedAt?: string;
  completedSubtasks?: string[];
}

export interface AppSettings {
  userName: string;
  monkModeEnabled: boolean;
  notificationsEnabled: boolean;
  lastResetDate: string;
  lastWeeklyReviewDate: string;
  theme: 'super_amoled' | 'light';
  accentColor: 'orange' | 'red' | 'maroon' | 'blue' | 'green' | 'purple' | 'pink' | 'cyan' | 'yellow';
}

export interface DailyScore {
  completed: number;
  total: number;
  percentage: number;
  missed: number;
}

export interface DailyStats {
  date: string;
  total: number;
  completed: number;
  missed: number;
  completionPercent: number;
  dailyScore: number;
  isLocked: boolean;
}

export interface LifetimeStats {
  totalCompleted: number;
  totalMissed: number;
  totalScheduled: number;
  overallCompletion: number;
  longestEverStreak: number;
  currentBestStreak: number;
  activeDays: number;
  habitsCreated: number;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalScheduled: number;
  completed: number;
  missed: number;
  completionPercent: number;
  bestHabitId: string;
  worstHabitId: string;
  longestStreak: number;
  averageCompletion: number;
}

export interface MonthlyStats {
  month: string;
  totalScheduled: number;
  completed: number;
  missed: number;
  completionPercent: number;
  mostConsistentHabitId: string;
  leastConsistentHabitId: string;
}

export interface StreakFreeze {
  habitId: string;
  month: string;
  usedDate: string;
}

export interface WidgetCache {
  progress: number;
  streak: number;
 completed: number;
  remaining: number;
  tasks: Array<{
    emoji: string;
    name: string;
    completed: boolean;
  }>;
}


export interface TodayTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}
