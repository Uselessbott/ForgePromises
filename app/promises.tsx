import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useHabits } from '@/context/HabitsContext';
import { HabitLog } from '@/context/types';

export default function PromisesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getPromisesKept, getPromiseHistory, logs, habits } = useHabits();

  const promisesKept = getPromisesKept();

  // Build full history (completed + missed) for all Promise habits
  const fullHistory = useMemo(() => {
    const promiseIds = new Set(
      habits.filter(h => h.priority === 'promise').map(h => h.id)
    );
    // Get all logs for promise habits (both completed and missed)
    const relevantLogs = logs.filter(
      l => promiseIds.has(l.habitId) && (l.status === 'completed' || l.status === 'missed')
    );
    // Sort newest first
    relevantLogs.sort((a, b) => b.date.localeCompare(a.date));
    return relevantLogs.map(l => {
      const habit = habits.find(h => h.id === l.habitId);
      return {
        date: l.date,
        habitId: l.habitId,
        habitName: habit?.name ?? 'Unknown Promise',
        emoji: habit?.emoji ?? '❤️',
        status: l.status,
      };
    });
  }, [logs, habits]);

  // Group history by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof fullHistory> = {};
    fullHistory.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [fullHistory]);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: bottomInset + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Promises</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Philosophy Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>What is a Promise?</Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            A Promise is your highest priority commitment for the day.{'\n'}
            Every morning you choose one Promise.{'\n'}
            Keeping it strengthens your consistency.{'\n'}
            Missing it doesn't erase your history—it reminds you to improve.
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>YOUR PROMISE STATISTICS</Text>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statRow}>
              <Text style={styles.statEmoji}>❤️</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{promisesKept}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Promises Kept</Text>
            </View>
          </View>
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PROMISE HISTORY</Text>
          {fullHistory.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No promises yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Choose your first Daily Promise to begin your journey.
              </Text>
            </View>
          ) : (
            grouped.map(([date, items]) => (
              <View key={date} style={styles.historyGroup}>
                <Text style={[styles.dateHeader, { color: colors.mutedForeground }]}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
                {items.map((item, idx) => (
                  <View key={`${item.date}-${item.habitId}-${idx}`} style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.historyIcon}>{item.status === 'completed' ? '❤️' : '💔'}</Text>
                    <Text style={[styles.historyName, { color: colors.foreground }]}>{item.habitName}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 12 },
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  historyGroup: { marginBottom: 16 },
  dateHeader: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    paddingLeft: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
    gap: 8,
  },
  historyIcon: { fontSize: 16 },
  historyName: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  emptyDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
