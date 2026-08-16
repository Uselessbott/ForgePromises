import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useHabits } from '@/context/HabitsContext';
import {
  getTodayStr, getDaysInMonth, getFirstDayOfMonth, formatDate, parseDate,
  MONTH_NAMES, WEEKDAY_LABELS,
} from '@/utils/scheduling';

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getCalendarDay, getHabitsForDate, getLogForHabit, getStreakData } = useHabits();

  const today = getTodayStr();
  const todayDate = parseDate(today);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const cells = useMemo(() => {
    const result: Array<{ day: number; date: string } | null> = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push({ day: d, date });
    }
    return result;
  }, [viewYear, viewMonth, daysInMonth, firstDay]);

  const dayData = useMemo(() => {
    const map: Record<string, ReturnType<typeof getCalendarDay>> = {};
    for (const cell of cells) {
      if (cell) map[cell.date] = getCalendarDay(cell.date);
    }
    return map;
  }, [cells, getCalendarDay]);

  const COLOR_MAP = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', none: 'transparent' };

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const selectedDayData = selectedDate ? dayData[selectedDate] : null;
  const selectedHabits = selectedDate ? getHabitsForDate(selectedDate) : [];

  const monthStats = useMemo(() => {
    let green = 0, yellow = 0, red = 0, total = 0;
    for (const cell of cells) {
      if (!cell || cell.date > today) continue;
      const d = dayData[cell.date];
      if (d && d.total > 0) {
        total++;
        if (d.color === 'green') green++;
        else if (d.color === 'yellow') yellow++;
        else if (d.color === 'red') red++;
      }
    }
    return { green, yellow, red, total };
  }, [cells, dayData, today]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Calendar</Text>

        {/* Month Nav */}
        <View style={[styles.monthNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.foreground }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Month Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { num: monthStats.green, label: '🟩 Perfect', color: '#22c55e' },
            { num: monthStats.yellow, label: '🟨 Partial', color: '#eab308' },
            { num: monthStats.red, label: '🟥 Missed', color: '#ef4444' },
            { num: monthStats.total > 0 ? Math.round((monthStats.green / monthStats.total) * 100) : 0, label: '% Perfect', color: colors.primary },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.num}{s.label === '% Perfect' ? '%' : ''}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label.replace(/[0-9%]/g, '').trim()}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Weekday Labels */}
        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((l, i) => (
            <Text key={i} style={[styles.weekLabel, { color: colors.mutedForeground }]}>{l}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {cells.map((cell, i) => {
            if (!cell) return <View key={`e-${i}`} style={styles.cell} />;
            const data = dayData[cell.date] || { color: 'none', total: 0 };
            const isFuture = cell.date > today;
            const isToday = cell.date === today;
            const dotColor = COLOR_MAP[data.color as keyof typeof COLOR_MAP];
            return (
              <TouchableOpacity
                key={cell.date}
                onPress={() => { if (!isFuture && data.total > 0) setSelectedDate(cell.date); }}
                style={[styles.cell, isToday && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayNum, {
                  color: isFuture ? colors.mutedForeground + '44' : isToday ? colors.primary : colors.foreground,
                  fontFamily: isToday ? 'Inter_700Bold' : 'Inter_400Regular',
                }]}>
                  {cell.day}
                </Text>
                <View style={[styles.dot, { backgroundColor: isFuture ? 'transparent' : dotColor }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[{ color: '#22c55e', label: '100%' }, { color: '#eab308', label: 'Partial' }, { color: '#ef4444', label: '0%' }].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{l.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={!!selectedDate} transparent animationType="slide" onRequestClose={() => setSelectedDate(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {selectedDate ? `${MONTH_NAMES[parseInt(selectedDate.split('-')[1]) - 1]} ${parseInt(selectedDate.split('-')[2])}, ${selectedDate.split('-')[0]}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {selectedDayData && (
              <View style={[styles.dayScoreRow, { backgroundColor: colors.background, borderRadius: 10, padding: 12, marginBottom: 16 }]}>
                {[
                  { num: selectedDayData.completed, label: 'Done', color: '#22c55e' },
                  { num: selectedDayData.missed, label: 'Missed', color: '#ef4444' },
                  { num: selectedDayData.total, label: 'Total', color: colors.foreground },
                  { num: selectedDayData.percentage, label: 'Score', color: colors.primary, suffix: '%' },
                ].map((s, i) => (
                  <View key={i} style={styles.dayScoreItem}>
                    <Text style={[styles.dayScoreNum, { color: s.color }]}>{s.num}{s.suffix || ''}</Text>
                    <Text style={[styles.dayScoreLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {selectedHabits.map(h => {
                const log = selectedDate ? getLogForHabit(h.id, selectedDate) : undefined;
                const status = log?.status;
                const icon = status === 'completed' ? '✅' : status === 'frozen' ? '❄️' : '❌';
                const { current } = getStreakData(h.id);
                return (
                  <View key={h.id} style={[styles.habitRow, { borderColor: colors.border }]}>
                    <Text style={{ fontSize: 18 }}>{h.emoji || '✨'}</Text>
                    <Text style={[styles.habitRowName, { color: status === 'completed' ? colors.mutedForeground : colors.foreground }]} numberOfLines={1}>{h.name}</Text>
                    {current > 0 && <Text style={[{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary }]}>🔥{current}</Text>}
                    <Text style={{ fontSize: 16 }}>{icon}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 20 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  statsRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16, justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayNum: { fontSize: 13, marginBottom: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  dayScoreRow: { flexDirection: 'row', justifyContent: 'space-around' },
  dayScoreItem: { alignItems: 'center' },
  dayScoreNum: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  dayScoreLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  habitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  habitRowName: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
