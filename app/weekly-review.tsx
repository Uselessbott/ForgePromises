import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useHabits } from '@/context/HabitsContext';
import { MONTH_NAMES, parseDate } from '@/utils/scheduling';

export default function WeeklyReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getWeeklyReview, habits, updateSettings, settings } = useHabits();

  const review = useMemo(() => getWeeklyReview(), []);
  const activeHabits = habits.filter(h => !h.archived);

  const bestHabit = activeHabits.find(h => h.id === review.bestHabitId);
  const worstHabit = activeHabits.find(h => h.id === review.worstHabitId);

  const weekStartDate = parseDate(review.weekStart);
  const weekEndDate = parseDate(review.weekEnd);
  const periodLabel = `${MONTH_NAMES[weekStartDate.getMonth()]} ${weekStartDate.getDate()} – ${MONTH_NAMES[weekEndDate.getMonth()]} ${weekEndDate.getDate()}`;

  function dismiss() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    updateSettings({ lastWeeklyReviewDate: todayStr });
    router.back();
  }

  const scoreColor = review.completionPercent >= 90 ? '#22c55e'
    : review.completionPercent >= 70 ? colors.primary
    : review.completionPercent >= 50 ? '#eab308'
    : '#ef4444';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.weekLabel, { color: colors.mutedForeground }]}>WEEKLY REVIEW</Text>
            <Text style={[styles.periodLabel, { color: colors.foreground }]}>{periodLabel}</Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Big Score */}
        <View style={[styles.scoreCard, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '33' }]}>
          <Text style={[styles.scorePct, { color: scoreColor }]}>{review.completionPercent}%</Text>
          <Text style={[styles.scoreSubtitle, { color: colors.foreground }]}>Weekly Completion</Text>
          <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>{review.summary}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { icon: '✅', label: 'Completed', value: review.completed, color: '#22c55e' },
            { icon: '❌', label: 'Missed', value: review.missed, color: '#ef4444' },
            { icon: '📋', label: 'Scheduled', value: review.totalScheduled, color: colors.foreground },
            { icon: '🔥', label: 'Best Streak', value: `${review.longestStreak}d`, color: colors.primary },
          ].map(s => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text style={[styles.statBoxNum, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Best & Worst */}
        {(bestHabit || worstHabit) && (
          <View style={styles.row}>
            {bestHabit && (
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: '#22c55e33' }]}>
                <Text style={[styles.halfLabel, { color: colors.mutedForeground }]}>BEST HABIT</Text>
                <Text style={{ fontSize: 32, marginVertical: 8 }}>{bestHabit.emoji || '✨'}</Text>
                <Text style={[styles.halfName, { color: '#22c55e' }]} numberOfLines={2}>{bestHabit.name}</Text>
              </View>
            )}
            {worstHabit && worstHabit.id !== bestHabit?.id && (
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: '#ef444433' }]}>
                <Text style={[styles.halfLabel, { color: colors.mutedForeground }]}>NEEDS WORK</Text>
                <Text style={{ fontSize: 32, marginVertical: 8 }}>{worstHabit.emoji || '✨'}</Text>
                <Text style={[styles.halfName, { color: '#ef4444' }]} numberOfLines={2}>{worstHabit.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Motivation */}
        <View style={[styles.motivationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.motivationText, { color: colors.mutedForeground }]}>
            {review.completionPercent >= 70
              ? '"The secret of your future is hidden in your daily routine."'
              : '"Every master was once a disaster. Keep showing up."'}
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity onPress={dismiss} style={[styles.ctaBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
          <Text style={styles.ctaBtnText}>Start This Week Strong →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  weekLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.4, marginBottom: 4 },
  periodLabel: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scoreCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', marginBottom: 20 },
  scorePct: { fontSize: 64, fontFamily: 'Inter_700Bold', letterSpacing: -3 },
  scoreSubtitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  summaryText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox: { width: '47%', borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  statBoxNum: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  statBoxLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center' },
  halfLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  halfName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  motivationCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  motivationText: { fontSize: 14, fontFamily: 'Inter_400Regular', fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },
  ctaBtn: { borderRadius: 16, padding: 18, alignItems: 'center' },
  ctaBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
