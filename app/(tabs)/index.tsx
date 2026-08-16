import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useHabits } from '@/context/HabitsContext';
import { HabitCard } from '@/components/HabitCard';
import { ProgressRing } from '@/components/ProgressRing';
import { PromiseIsland } from '@/components/PromiseIsland';
import { DailyPromiseModal } from '@/components/DailyPromiseModal';
import { getTodayStr, getWeekStart, MONTH_NAMES, parseDate } from '@/utils/scheduling';
import { getDailyNudge } from '@/utils/motivations';
import { updateMonkMode } from "@/utils/monkMode";

function getGreeting(name: string, remaining: number, completed: number): string {
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = name?.trim() || 'Champion';
  if (remaining === 0 && completed > 0) return `${firstName}, all done today. 🔥`;
  if (remaining === 1) return `${firstName}, 1 task remaining.`;
  if (remaining > 1) return `${firstName}, ${remaining} tasks remaining.`;
  return `${timeGreet}, ${firstName}.`;
}

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    habits,
    settings,
    
    getHabitsForDate,
    getLogForHabit,
    getDailyScore,
    getStreakData,
    getWeeklyTargetProgress,
    dailyPromise,
    hasDailyPromise,
    getDailyPromise,
    getTodayPromiseHabits,
    isDailyPromiseCompleted,
    getPromiseProgress,
    selectDailyPromise,
    markHabit,
    applyStreakFreeze,
    canUseStreakFreeze,
    updateSettings,
    
    
    
    toggleSubtask,
    renameSubtask,
    deleteSubtask,
  } = useHabits();

  const today = getTodayStr();
  const weekStart = getWeekStart(today);
  const score = getDailyScore(today);
  const todayHabits = getHabitsForDate(today);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayStr = yesterday.toISOString().slice(0,10);

  const yesterdayScore = getDailyScore(yesterdayStr);

  const yesterdayMissed =
    yesterdayScore.total > 0 &&
    yesterdayScore.completed < yesterdayScore.total;

  const quote = useMemo(
    () => getDailyNudge(score.completed, score.total, yesterdayMissed),
    [score.completed, score.total, yesterdayMissed]
  );

  
const promiseHabits = getTodayPromiseHabits();

const [showPromiseModal, setShowPromiseModal] = useState(false);

useEffect(() => {

  if (hasDailyPromise()) {
    setShowPromiseModal(false);
    return;
  }

  if (promiseHabits.length === 1) {
    selectDailyPromise(promiseHabits[0].id);
    return;
  }

  if (promiseHabits.length > 1)
    setShowPromiseModal(true);

}, [dailyPromise, promiseHabits]);

  const currentPromise = getDailyPromise();
  const hasPromise = hasDailyPromise();
  const promiseCompleted = isDailyPromiseCompleted();

  const promiseProgress = getPromiseProgress();
  const remaining = score.total - score.completed;

  const bestStreak = useMemo(() => {
    if (todayHabits.length === 0) return 0;
    return todayHabits.reduce((max, h) => Math.max(max, getStreakData(h.id).current), 0);
  }, [todayHabits]);

  const longestStreak = useMemo(() => {
    if (habits.filter(h => !h.archived).length === 0) return 0;
    return habits.filter(h => !h.archived).reduce((max, h) => Math.max(max, getStreakData(h.id).longest), 0);
  }, [habits]);

  const greeting = getGreeting(settings.userName, remaining, score.completed);

  const now = new Date();
  const dateLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  function handleToggle(habitId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markHabit(habitId, today);
    if (settings.monkModeEnabled) {
      setTimeout(() => {
        const score = getDailyScore(today);
      }, 50);
    }
  }

  function handleMonkMode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    updateSettings({ monkModeEnabled: !settings.monkModeEnabled });
  }

  function handleStreakFreeze() {
    if (!canUseStreakFreeze()) {
      Alert.alert('No Freeze Available', 'You\'ve already used your streak freeze this month.');
      return;
    }
    Alert.alert(
      '❄️ Use Streak Freeze?',
      'This protects all your streaks for today. You get 1 freeze per month.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use Freeze', onPress: async () => { if (await applyStreakFreeze()) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
      ],
    );
  }

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: 120 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.headerLeft}>
              <Text style={styles.flame}>🔥</Text>
              <Text style={[styles.appName, { color: colors.foreground }]}>ForgePromises</Text>
            </View>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>{dateLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={handleMonkMode}
            style={[styles.monkBtn, { backgroundColor: settings.monkModeEnabled ? colors.primary : colors.card, borderColor: settings.monkModeEnabled ? colors.primary : colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.monkBtnText, { color: settings.monkModeEnabled ? '#fff' : colors.mutedForeground }]}>
              {settings.monkModeEnabled ? '🔥 MONK' : 'Monk Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Monk Mode Banner */}
        {settings.monkModeEnabled && (
          <View style={[styles.monkBanner, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}>
            <Text style={[styles.monkBannerText, { color: colors.primary }]}>
              🔥 MONK MODE — No distractions. No excuses. Only discipline.
            </Text>
          </View>
        )}

        
        {/* Greeting */}
        <Text style={[styles.greeting, { color: colors.foreground }]}>{greeting}</Text>

        {/* Quote */}
        <View style={[styles.quoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quoteText, { color: colors.mutedForeground }]}>"{quote}"</Text>
        </View>

        {/* Progress + Stats */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ProgressRing
            progress={score.total > 0 ? score.completed / score.total : 0}
            size={96}
            strokeWidth={8}
            color={score.percentage === 100 ? '#22c55e' : colors.primary}
            trackColor={colors.border}
          >
            <View style={styles.scoreInner}>
              <Text style={[styles.scorePct, { color: colors.foreground }]}>{score.percentage}%</Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>done</Text>
            </View>
          </ProgressRing>

          <View style={styles.scoreDetails}>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreNum, { color: '#22c55e' }]}>{score.completed}</Text>
              <Text style={[styles.scoreDesc, { color: colors.mutedForeground }]}>completed</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreNum, { color: colors.mutedForeground }]}>{remaining}</Text>
              <Text style={[styles.scoreDesc, { color: colors.mutedForeground }]}>remaining</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreNum, { color: colors.primary }]}>{bestStreak}🔥</Text>
              <Text style={[styles.scoreDesc, { color: colors.mutedForeground }]}>streak</Text>
            </View>          </View>
        </View>


        <PromiseIsland
          kept={promiseProgress.currentKept}
          current={promiseProgress.currentPromiseCount}
          limit={promiseProgress.currentLimit}
          unlimited={promiseProgress.nextUnlock === null}
          onPress={() => router.push('/promises')}
        />

        {/* Today's Promise */}
        {promiseHabits.length > 0 && (
          <View
            style={[
              styles.quoteCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginBottom: 18,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.primary,
                  marginBottom: 10,
                },
              ]}
            >
              ❤️ TODAY'S PROMISE
            </Text>

            {hasPromise && (
              <>
                <Text
                  style={[
                    styles.quoteText,
                    { color: colors.foreground },
                  ]}
                >
                  {currentPromise?.emoji} {currentPromise?.name}
                </Text>

                <Text
                  style={[
                    styles.scoreLabel,
                    {
                      color: promiseCompleted
                        ? '#22c55e'
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {promiseCompleted
                    ? '✅ Promise Kept'
                    : "Today's commitment"}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Habits by Priority */}
        {todayHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🌅</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing scheduled today</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Add habits in the Habits tab to get started.
            </Text>
          </View>
        ) : (
          <>
            {(['promise', 'important', 'optional'] as const).map(priority => {
              const priorityHabits = todayHabits.filter(
                h => (h.priority || 'optional') === priority
              );
              if (priorityHabits.length === 0) return null;

              const emoji =
                priority === 'promise'
                  ? '❤️'
                  : priority === 'important'
                  ? '⭐'
                  : '🌱';

              const title =
                priority === 'promise'
                  ? 'PROMISE'
                  : priority === 'important'
                  ? 'IMPORTANT'
                  : 'OPTIONAL';

              return (
                <View key={priority} style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                    {emoji} {title}
                  </Text>

                  {priorityHabits.map(habit => {
                    const log = getLogForHabit(habit.id, today);
                    const { current } = getStreakData(habit.id);
                    const weeklyProgress =
                      habit.frequency === 'weekly_target'
                        ? getWeeklyTargetProgress(habit.id, weekStart)
                        : undefined;

                    return (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        log={log}
                        streak={current}
                        isToday={true}
                        onToggle={() => handleToggle(habit.id)}
                        weeklyProgress={weeklyProgress}
                        onToggleSubtask={(subtaskId) =>
                          toggleSubtask(habit.id, subtaskId, today)
                        }
                        onRenameSubtask={(subtaskId, title) =>
                          renameSubtask(habit.id, subtaskId, title)
                        }
                        onDeleteSubtask={(subtaskId) =>
                          deleteSubtask(habit.id, subtaskId)
                        }
                      />
                    );
                  })}
                </View>
              );
            })}
          </>
        )}

        {/* Streak Freeze */}
        {canUseStreakFreeze() && (
          <TouchableOpacity onPress={handleStreakFreeze} style={[styles.freezeBtn, { backgroundColor: 'rgba(96,165,250,0.08)', borderColor: 'rgba(96,165,250,0.25)' }]} activeOpacity={0.7}>
            <Text style={styles.freezeText}>❄️ Use Streak Freeze</Text>
            <Text style={[styles.freezeSub, { color: colors.mutedForeground }]}>1 available this month · protects all habits today</Text>
          </TouchableOpacity>
        )}

        {/* Completion Banner */}
        {score.total > 0 && score.percentage === 100 && (
          <View style={[styles.completionBanner, { backgroundColor: '#22c55e22', borderColor: '#22c55e44' }]}>
            <Text style={[styles.completionText, { color: '#22c55e' }]}>
              🏆 All habits complete! Outstanding discipline.
            </Text>
          </View>
        )}
      </ScrollView>

      <DailyPromiseModal
        visible={showPromiseModal}
        promises={promiseHabits}
        onConfirm={(id) => {
          selectDailyPromise(id);
          setShowPromiseModal(false);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flame: { fontSize: 22 },
  appName: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  dateLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  monkBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  monkBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 },
  monkBanner: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16 },
  monkBannerText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center', letterSpacing: 0.4 },
  greeting: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 12 },
  quoteCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  quoteText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, fontStyle: 'italic' },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 24, minHeight: 170 },
  scoreInner: { alignItems: 'center' },
  scorePct: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  scoreLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  scoreDetails: { flex: 1, gap: 10, justifyContent: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreNum: { fontSize: 18, fontFamily: 'Inter_700Bold', width: 52 },
  scoreDesc: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  emptyDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  freezeBtn: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  freezeText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#60A5FA', marginBottom: 2 },
  freezeSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  completionBanner: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', marginTop: 8 },
  completionText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  taskInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, marginBottom: 12, paddingHorizontal: 12 },
  taskInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 12 },
  taskAddBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  taskAddBtnText: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold', lineHeight: 20 },
  emptyTaskText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 8 },
  taskItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  taskCheckbox: { marginRight: 12 },
  checkboxInner: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  taskTitle: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  taskDeleteBtn: { padding: 4 },
});
