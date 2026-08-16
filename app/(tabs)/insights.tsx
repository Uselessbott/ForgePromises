import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useHabits } from '@/context/HabitsContext';
import { getTodayStr, getWeekStart, addDays } from '@/utils/scheduling';
import { WeeklyBarChart, MonthlyLineChart, PieChart } from '@/components/Charts';

type Tab = 'daily' | 'weekly' | 'monthly' | 'lifetime';

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    habits, logs, getDailyStats, getWeeklyStats, getMonthlyStats, getLifetimeStats,
    getLast7DaysData, getStreakData, getCalendarDay,
  } = useHabits();
  const [tab, setTab] = useState<Tab>('daily');

  const today = getTodayStr();
  const weekStart = getWeekStart(today);
  const month = today.substring(0, 7);
  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const dailyStats = useMemo(() => getDailyStats(today), [today, logs]);
  const weeklyStats = useMemo(() => getWeeklyStats(weekStart), [weekStart, logs]);
  const monthlyStats = useMemo(() => getMonthlyStats(month), [month, logs]);
  const lifetimeStats = useMemo(() => getLifetimeStats(), [logs]);
  const last7Days = useMemo(() => getLast7DaysData(), [today, logs]);

  const activeHabits = habits.filter(h => !h.archived);

  const bestHabit = useMemo(() => {
    if (!weeklyStats.bestHabitId) return null;
    return activeHabits.find(h => h.id === weeklyStats.bestHabitId);
  }, [weeklyStats, activeHabits]);

  const worstHabit = useMemo(() => {
    if (!weeklyStats.worstHabitId) return null;
    return activeHabits.find(h => h.id === weeklyStats.worstHabitId);
  }, [weeklyStats, activeHabits]);

  const monthDays = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29);
    const d = getCalendarDay(date);
    return d.percentage;
  }), [today, logs]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: 'Week' },
    { key: 'monthly', label: 'Month' },
    { key: 'lifetime', label: 'All Time' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Insights</Text>

        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, tab === t.key && { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: tab === t.key ? '#fff' : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'daily' && (
          <>
            <StatCard
              colors={colors}
              items={[
                { label: 'Completed', value: dailyStats.completed, color: '#22c55e' },
                { label: 'Missed', value: dailyStats.missed, color: '#ef4444' },
                { label: 'Total', value: dailyStats.total, color: colors.foreground },
                { label: 'Score', value: `${dailyStats.completionPercent}%`, color: colors.primary },
              ]}
            />
            {dailyStats.total > 0 && (
              <PieChart
                colors={colors}
                completed={dailyStats.completed}
                missed={dailyStats.missed}
                total={dailyStats.total}
                title="Today's Completion"
              />
            )}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LAST 7 DAYS</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <WeeklyBarChart data={last7Days} colors={colors} />
            </View>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TODAY'S HABITS</Text>
            {activeHabits.map(h => {
              const { current, longest } = getStreakData(h.id);
              return (
                <View key={h.id} style={[styles.habitStatRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 20 }}>{h.emoji || '✨'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.habitStatName, { color: colors.foreground }]} numberOfLines={1}>{h.name}</Text>
                    <Text style={[styles.habitStatSub, { color: colors.mutedForeground }]}>Best: {longest} days</Text>
                  </View>
                  {current > 0 && (
                    <View style={[styles.streakBadge, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={[styles.streakBadgeText, { color: colors.primary }]}>🔥 {current}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {tab === 'weekly' && (
          <>
            <StatCard
              colors={colors}
              items={[
                { label: 'Completed', value: weeklyStats.completed, color: '#22c55e' },
                { label: 'Missed', value: weeklyStats.missed, color: '#ef4444' },
                { label: 'Total', value: weeklyStats.totalScheduled, color: colors.foreground },
                { label: 'Rate', value: `${weeklyStats.completionPercent}%`, color: colors.primary },
              ]}
            />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DAILY COMPLETION THIS WEEK</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <WeeklyBarChart data={last7Days} colors={colors} />
            </View>
            {weeklyStats.totalScheduled > 0 && (
              <PieChart
                colors={colors}
                completed={weeklyStats.completed}
                missed={weeklyStats.missed}
                total={weeklyStats.totalScheduled}
                title="Weekly Breakdown"
              />
            )}
            <View style={styles.row}>
              {bestHabit && (
                <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: '#22c55e33' }]}>
                  <Text style={[styles.halfCardLabel, { color: colors.mutedForeground }]}>BEST HABIT</Text>
                  <Text style={{ fontSize: 28 }}>{bestHabit.emoji || '✨'}</Text>
                  <Text style={[styles.halfCardName, { color: '#22c55e' }]} numberOfLines={2}>{bestHabit.name}</Text>
                </View>
              )}
              {worstHabit && worstHabit.id !== bestHabit?.id && (
                <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: '#ef444433' }]}>
                  <Text style={[styles.halfCardLabel, { color: colors.mutedForeground }]}>NEEDS WORK</Text>
                  <Text style={{ fontSize: 28 }}>{worstHabit.emoji || '✨'}</Text>
                  <Text style={[styles.halfCardName, { color: '#ef4444' }]} numberOfLines={2}>{worstHabit.name}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WEEKLY STREAKS</Text>
            {activeHabits.slice(0, 10).map(h => {
              const { current, longest } = getStreakData(h.id);
              return (
                <View key={h.id} style={[styles.habitStatRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 20 }}>{h.emoji || '✨'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.habitStatName, { color: colors.foreground }]} numberOfLines={1}>{h.name}</Text>
                    <Text style={[styles.habitStatSub, { color: colors.mutedForeground }]}>Longest: {longest}</Text>
                  </View>
                  <View style={[styles.streakBadge, { backgroundColor: current > 0 ? colors.primary + '22' : colors.card }]}>
                    <Text style={[styles.streakBadgeText, { color: current > 0 ? colors.primary : colors.mutedForeground }]}>
                      {current > 0 ? `🔥 ${current}` : '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === 'monthly' && (
          <>
            <StatCard
              colors={colors}
              items={[
                { label: 'Completed', value: monthlyStats.completed, color: '#22c55e' },
                { label: 'Missed', value: monthlyStats.missed, color: '#ef4444' },
                { label: 'Scheduled', value: monthlyStats.totalScheduled, color: colors.foreground },
                { label: 'Rate', value: `${monthlyStats.completionPercent}%`, color: colors.primary },
              ]}
            />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>30-DAY TREND</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MonthlyLineChart data={monthDays} colors={colors} />
            </View>
            {monthlyStats.totalScheduled > 0 && (
              <PieChart
                colors={colors}
                completed={monthlyStats.completed}
                missed={monthlyStats.missed}
                total={monthlyStats.totalScheduled}
                title="Monthly Breakdown"
              />
            )}
            {(() => {
              const most = activeHabits.find(h => h.id === monthlyStats.mostConsistentHabitId);
              const least = activeHabits.find(h => h.id === monthlyStats.leastConsistentHabitId);
              return (
                <View style={styles.row}>
                  {most && (
                    <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: '#22c55e33' }]}>
                      <Text style={[styles.halfCardLabel, { color: colors.mutedForeground }]}>MOST CONSISTENT</Text>
                      <Text style={{ fontSize: 28 }}>{most.emoji || '✨'}</Text>
                      <Text style={[styles.halfCardName, { color: '#22c55e' }]} numberOfLines={2}>{most.name}</Text>
                    </View>
                  )}
                  {least && least.id !== most?.id && (
                    <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: '#ef444433' }]}>
                      <Text style={[styles.halfCardLabel, { color: colors.mutedForeground }]}>LEAST CONSISTENT</Text>
                      <Text style={{ fontSize: 28 }}>{least.emoji || '✨'}</Text>
                      <Text style={[styles.halfCardName, { color: '#ef4444' }]} numberOfLines={2}>{least.name}</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </>
        )}

        {tab === 'lifetime' && (
          <>
            <View style={[styles.bigStatCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}>
              <Text style={[styles.bigStatNum, { color: colors.primary }]}>{lifetimeStats.overallCompletion}%</Text>
              <Text style={[styles.bigStatLabel, { color: colors.mutedForeground }]}>Overall Completion Rate</Text>
            </View>
            <StatCard
              colors={colors}
              items={[
                { label: '✅ Done', value: lifetimeStats.totalCompleted, color: '#22c55e' },
                { label: '❌ Missed', value: lifetimeStats.totalMissed, color: '#ef4444' },
                { label: '📅 Days Active', value: lifetimeStats.activeDays, color: colors.foreground },
                { label: '💪 Habits', value: lifetimeStats.habitsCreated, color: colors.primary },
              ]}
            />
            <View style={styles.row}>
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.primary + '33' }]}>
                <Text style={[styles.halfCardLabel, { color: colors.mutedForeground }]}>LONGEST STREAK EVER</Text>
                <Text style={[styles.bigNum, { color: colors.primary }]}>{lifetimeStats.longestEverStreak}</Text>
                <Text style={[styles.halfCardName, { color: colors.mutedForeground }]}>days</Text>
              </View>
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: '#22c55e33' }]}>
                <Text style={[styles.halfCardLabel, { color: colors.mutedForeground }]}>CURRENT BEST</Text>
                <Text style={[styles.bigNum, { color: '#22c55e' }]}>{lifetimeStats.currentBestStreak}</Text>
                <Text style={[styles.halfCardName, { color: colors.mutedForeground }]}>days 🔥</Text>
              </View>
            </View>
            {lifetimeStats.totalCompleted + lifetimeStats.totalMissed > 0 && (
              <PieChart
                colors={colors}
                completed={lifetimeStats.totalCompleted}
                missed={lifetimeStats.totalMissed}
                title="All-Time Ratio"
              />
            )}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ALL HABITS — LIFETIME STREAKS</Text>
            {activeHabits.map(h => {
              const { current, longest } = getStreakData(h.id);
              const pct = longest > 0 ? Math.round((current / longest) * 100) : 0;
              return (
                <View key={h.id} style={[styles.habitStatRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 20 }}>{h.emoji || '✨'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.habitStatName, { color: colors.foreground }]} numberOfLines={1}>{h.name}</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${Math.min(pct, 100)}%` as any }]} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.streakBadgeText, { color: colors.primary }]}>{current > 0 ? `🔥${current}` : '—'}</Text>
                    <Text style={[{ fontSize: 10, color: colors.mutedForeground }]}>best: {longest}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ colors, items }: { colors: any; items: { label: string; value: string | number; color: string }[] }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
          <View style={styles.statCardItem}>
            <Text style={[styles.statCardNum, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.statCardLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 20 },
  tabBar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 20, gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  statCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, justifyContent: 'space-around' },
  statCardItem: { alignItems: 'center' },
  statCardNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statCardLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  divider: { width: 1, marginVertical: 4 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  habitStatRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 12 },
  habitStatName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  habitStatSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  streakBadgeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6 },
  halfCardLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  halfCardName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  bigStatCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  bigStatNum: { fontSize: 48, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  bigStatLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 },
  bigNum: { fontSize: 36, fontFamily: 'Inter_700Bold' },
  progressBarBg: { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressBarFill: { height: 4, borderRadius: 2 },
});
