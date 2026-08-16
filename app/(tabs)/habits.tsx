import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useHabits } from '@/context/HabitsContext';
import { Habit } from '@/context/types';
import { getTodayStr, getWeekStart } from '@/utils/scheduling';

const PRIORITY_ORDER = ['promise', 'important', 'optional'] as const;
type FilterType = 'all' | 'daily' | 'weekly' | 'weekly_target' | 'monthly' | 'archived';

function FrequencyBadge({ habit }: { habit: Habit }) {
  const colors = useColors();
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly_target: `${habit.weeklyTarget}×/wk`,
    monthly: 'Monthly',
    weekly: (() => {
      const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      return (habit.weekdays ?? []).map(d => days[d]).join(' ') || 'Weekly';
    })(),
  };
  const bgColors: Record<string, string> = {
    daily: '#E05A1A22',
    weekly: '#8B5CF622',
    weekly_target: '#06B6D422',
    monthly: '#10B98122',
  };
  const textColors: Record<string, string> = {
    daily: '#E05A1A',
    weekly: '#A78BFA',
    weekly_target: '#22D3EE',
    monthly: '#34D399',
  };
  return (
    <View style={[styles.badge, { backgroundColor: bgColors[habit.frequency] || colors.card }]}>
      <Text style={[styles.badgeText, { color: textColors[habit.frequency] || colors.mutedForeground }]}>
        {labels[habit.frequency]}
      </Text>
    </View>
  );
}

export default function HabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    habits,
    logs,
    deleteHabit,
    archiveHabit,
    restoreHabit,
    getStreakData,
    getLogForHabit,
    searchHabits,
    getCurrentPromiseCount,
    getPromiseLimit,
    hasUnlockedUnlimitedPromises,
  } = useHabits();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const today = getTodayStr();
  const weekStart = getWeekStart(today);

  const promiseCount = getCurrentPromiseCount();
  const promiseLimit = getPromiseLimit();
  const unlimitedPromises = hasUnlockedUnlimitedPromises();


  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);
  const archivedHabits = useMemo(() => habits.filter(h => h.archived), [habits]);

  const filteredHabits = useMemo(() => {
    if (searchQuery.trim()) return searchHabits(searchQuery);
    if (filter === 'archived') return archivedHabits;
    if (filter === 'all') return activeHabits;
    return activeHabits.filter(h => h.frequency === filter);
  }, [habits, filter, searchQuery, activeHabits, archivedHabits]);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  function handleEdit(habitId: string) {
    router.push({ pathname: '/habit-form', params: { habitId } });
  }

  function handleDelete(habitId: string, habitName: string) {
    Alert.alert(
      'Delete Habit',
      `Delete "${habitName}"? This removes all logs and streaks permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); deleteHabit(habitId); } },
      ],
    );
  }

  function handleArchive(habitId: string, habitName: string) {
    Alert.alert(
      'Archive Habit',
      `Archive "${habitName}"? It won't appear in today's list. You can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: () => archiveHabit(habitId) },
      ],
    );
  }

  function handleRestore(habitId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restoreHabit(habitId);
  }


  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'weekly_target', label: 'Target' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'archived', label: 'Archived' },
  ];

  const showByPriority = !searchQuery.trim() && filter === 'all' && !showSearch;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: 120 + bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Habits</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowSearch(s => !s)} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={showSearch ? 'x' : 'search'} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/habit-form')} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search habits..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Filter Chips */}
        {!searchQuery.trim() && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
            {filters.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, { backgroundColor: filter === f.key ? colors.primary : colors.card, borderColor: filter === f.key ? colors.primary : colors.border }]}
              >
                <Text style={[styles.filterChipText, { color: filter === f.key ? '#fff' : colors.mutedForeground }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats Bar */}
        {!searchQuery.trim() && filter === 'all' && (
          <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{activeHabits.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>{activeHabits.filter(h => h.frequency === 'daily').length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Daily</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>{archivedHabits.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Archived</Text>
            </View>
          </View>
        )}

        {/* Promise Capacity */}
        {!searchQuery.trim() && filter === 'all' && (
          <View
            style={[
              styles.statsBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: -8,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={styles.statNum}>❤️</Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Promises
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: colors.border },
              ]}
            />

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNum,
                  { color: colors.primary },
                ]}
              >
                {promiseCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Current
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: colors.border },
              ]}
            />

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNum,
                  { color: colors.foreground },
                ]}
              >
                {unlimitedPromises ? "∞" : promiseLimit}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Capacity
              </Text>
            </View>
          </View>
        )}

        {/* Content */}
        {showByPriority ? (
          <>
            {PRIORITY_ORDER.map(priority => {
              const priorityHabits = activeHabits.filter(h => (h.priority || 'optional') === priority);
              if (priorityHabits.length === 0) return null;
              const emoji = priority === 'promise' ? '❤️' : priority === 'important' ? '⭐' : '🌱';
              const label = priority.charAt(0).toUpperCase() + priority.slice(1);
              return (
                <View key={priority} style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                    {emoji} {label.toUpperCase()}
                  </Text>
                  {priorityHabits.map(habit => (
                    <HabitListItem
                      key={habit.id}
                      habit={habit}
                      colors={colors}
                      streakData={getStreakData(habit.id)}
                      todayLog={getLogForHabit(habit.id, today)}
                      onEdit={() => handleEdit(habit.id)}
                      onArchive={() => handleArchive(habit.id, habit.name)}
                      onDelete={() => handleDelete(habit.id, habit.name)}
                    />
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.section}>
            {filter === 'archived' && (
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ARCHIVED</Text>
            )}
            {filteredHabits.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {searchQuery.trim() ? 'No habits match your search.' : filter === 'archived' ? 'No archived habits.' : 'No habits in this category.'}
                </Text>
              </View>
            ) : filteredHabits.map(habit => (
              filter === 'archived' ? (
                <ArchivedHabitItem key={habit.id} habit={habit} colors={colors} onRestore={() => handleRestore(habit.id)} onDelete={() => handleDelete(habit.id, habit.name)} />
              ) : (
                <HabitListItem key={habit.id} habit={habit} colors={colors} streakData={getStreakData(habit.id)} todayLog={getLogForHabit(habit.id, today)} onEdit={() => handleEdit(habit.id)} onArchive={() => handleArchive(habit.id, habit.name)} onDelete={() => handleDelete(habit.id, habit.name)} />
              )
            ))}
          </View>
        )}

        {activeHabits.length === 0 && filter === 'all' && !searchQuery && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✨</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No habits yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Tap + to create your first habit.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function HabitListItem({ habit, colors, streakData, todayLog, onEdit, onArchive, onDelete }: {
  habit: Habit; colors: any; streakData: { current: number; longest: number }; todayLog: any;
  onEdit: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompletedToday = todayLog?.status === 'completed';
  return (
    <TouchableOpacity
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
      style={[styles.habitItem, { backgroundColor: colors.card, borderColor: isCompletedToday ? colors.primary + '44' : colors.border }]}
    >
      <View style={styles.habitItemMain}>
        <Text style={styles.habitEmoji}>{habit.emoji || '✨'}</Text>
        <View style={styles.habitItemContent}>
          <View style={styles.habitItemTop}>
            <Text style={[styles.habitItemName, { color: colors.foreground }]} numberOfLines={1}>{habit.name}</Text>
            {isCompletedToday && <Text style={{ fontSize: 12 }}>✅</Text>}
          </View>
          <View style={styles.habitItemMeta}>
            <FrequencyBadge habit={habit} />
            {streakData.current > 0 && (
              <Text style={[styles.streakText, { color: colors.primary }]}>🔥{streakData.current}</Text>
            )}
          </View>
        </View>
      </View>
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          {habit.description ? <Text style={[styles.habitDesc, { color: colors.mutedForeground }]}>{habit.description}</Text> : null}
          <View style={styles.habitStats}>
            <Text style={[styles.habitStatText, { color: colors.mutedForeground }]}>Streak: {streakData.current} · Best: {streakData.longest}</Text>
            {habit.notes ? <Text style={[styles.habitDesc, { color: colors.mutedForeground }]} numberOfLines={2}>📝 {habit.notes}</Text> : null}
          </View>
          <View style={styles.habitActions}>
            <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, { borderColor: colors.border }]}>
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onArchive} style={[styles.actionBtn, { borderColor: colors.border }]}>
              <Feather name="archive" size={14} color={colors.mutedForeground} />
              <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { borderColor: '#ef444444' }]}>
              <Feather name="trash-2" size={14} color="#ef4444" />
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ArchivedHabitItem({ habit, colors, onRestore, onDelete }: { habit: Habit; colors: any; onRestore: () => void; onDelete: () => void }) {
  return (
    <View style={[styles.habitItem, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.7 }]}>
      <View style={styles.habitItemMain}>
        <Text style={styles.habitEmoji}>{habit.emoji || '✨'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.habitItemName, { color: colors.mutedForeground }]} numberOfLines={1}>{habit.name}</Text>
          <Text style={[styles.habitDesc, { color: colors.mutedForeground }]}>Archived</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onRestore} style={[styles.actionBtn, { borderColor: colors.primary + '44' }]}>
            <Text style={{ fontSize: 12, color: colors.primary }}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { borderColor: '#ef444444' }]}>
            <Feather name="trash-2" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  filterRow: { marginBottom: 16 },
  filterContent: { gap: 8, paddingRight: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  statsBar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 20, justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 10 },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catEmoji: { fontSize: 16 },
  catName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  catCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  catActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catActionBtn: { padding: 4 },
  habitItem: { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  habitItemMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  habitEmoji: { fontSize: 24 },
  habitItemContent: { flex: 1 },
  habitItemTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  habitItemName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  habitItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  streakText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  expandedSection: { borderTopWidth: 1, padding: 14, gap: 8 },
  habitDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  habitStats: { gap: 4 },
  habitStatText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  habitActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  emptyDesc: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
