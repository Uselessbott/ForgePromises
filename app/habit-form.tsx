import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useHabits } from '@/context/HabitsContext';
import { Habit, HabitFrequency, RepetitionType, Subtask } from '@/context/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_DATES = Array.from({ length: 31 }, (_, i) => i + 1);

export default function HabitFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const { habits, createHabit, updateHabit } = useHabits();

  const existing = habitId ? habits.find(h => h.id === habitId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '✨');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [priority, setPriority] = useState<'promise' | 'important' | 'optional'>(existing?.priority ?? 'optional');
  const [frequency, setFrequency] = useState<HabitFrequency>(existing?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [1, 2, 3, 4, 5]);
  const [weeklyTarget, setWeeklyTarget] = useState(existing?.weeklyTarget ?? 3);
  const [monthlyDates, setMonthlyDates] = useState<number[]>(existing?.monthlyDates ?? [1]);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(existing?.subtasks ?? []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [repType, setRepType] = useState<RepetitionType>(existing?.repetition?.type ?? 'forever');

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a habit name.');
      return;
    }
    const data: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'sortOrder'> = {
      name: name.trim(),
      emoji: emoji || '✨',
      description: description.trim(),
      priority,
      frequency,
      weekdays,
      weeklyTarget,
      monthlyDates,
      reminderTimes: [],
      notes: notes.trim(),
      repetition: { type: repType, count: 30, endDate: '' },
      subtasks: subtasks.length ? subtasks : undefined,
    };
    if (existing) {
      updateHabit(existing.id, data);
    } else {
      createHabit(data);
    }
    router.back();
  }

  function toggleWeekday(day: number) {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function toggleMonthDate(date: number) {
    setMonthlyDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date].sort((a, b) => a - b),
    );
  }

  function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return;

    setSubtasks(prev => [
      ...prev,
      {
        id: `subtask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: newSubtaskTitle.trim(),
      },
    ]);

    setNewSubtaskTitle('');
  }

  function handleDeleteSubtask(id: string) {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  }


  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {existing ? 'Edit Habit' : 'New Habit'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Emoji + Name */}
        <View style={styles.nameRow}>
          <TouchableOpacity
            style={[styles.emojiBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Habit name…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            autoFocus={!existing}
            returnKeyType="done"
          />
        </View>

        {/* Emoji Quick Picks */}
        <View style={styles.emojiRow}>
          {['🏃', '💧', '📖', '🧘', '💪', '🎯', '✍️', '🥗', '😴', '🎥', '💰', '🧠'].map(e => (
            <TouchableOpacity
              key={e}
              onPress={() => setEmoji(e)}
              style={[styles.emojiChip, { backgroundColor: emoji === e ? colors.primary + '33' : colors.card, borderColor: emoji === e ? colors.primary : colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiChipText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is this habit about?"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Priority */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Priority</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {(['promise', 'important', 'optional'] as const).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: priority === p ? colors.primary : colors.card,
                    borderColor: priority === p ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, { color: priority === p ? '#fff' : colors.foreground }]}>
                  {p === 'promise' ? '❤️ Promise' : p === 'important' ? '⭐ Important' : '🌱 Optional'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Frequency */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Frequency</Text>
          <View style={styles.freqGrid}>
            {([
              { key: 'daily', label: '📅 Daily' },
              { key: 'weekly', label: '📆 Specific Days' },
              { key: 'weekly_target', label: '🎯 Weekly Target' },
              { key: 'monthly', label: '🗓 Monthly Dates' },
            ] as { key: HabitFrequency; label: string }[]).map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFrequency(f.key)}
                style={[
                  styles.freqBtn,
                  {
                    backgroundColor: frequency === f.key ? colors.primary + '22' : colors.card,
                    borderColor: frequency === f.key ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.freqLabel, { color: frequency === f.key ? colors.primary : colors.foreground }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weekly Specific Days */}
        {frequency === 'weekly' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Select Days</Text>
            <View style={styles.daysRow}>
              {WEEKDAYS.map((day, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleWeekday(i)}
                  style={[
                    styles.dayBtn,
                    {
                      backgroundColor: weekdays.includes(i) ? colors.primary : colors.card,
                      borderColor: weekdays.includes(i) ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLabel, { color: weekdays.includes(i) ? '#fff' : colors.foreground }]}>
                    {day.slice(0, 2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Weekly Target */}
        {frequency === 'weekly_target' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Times Per Week</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                onPress={() => setWeeklyTarget(t => Math.max(1, t - 1))}
                style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name="minus" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.stepperVal, { color: colors.foreground }]}>{weeklyTarget}×</Text>
              <TouchableOpacity
                onPress={() => setWeeklyTarget(t => Math.min(7, t + 1))}
                style={[styles.stepperBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Monthly Dates */}
        {frequency === 'monthly' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Select Dates</Text>
            <View style={styles.datesGrid}>
              {MONTH_DATES.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => toggleMonthDate(d)}
                  style={[
                    styles.dateBtn,
                    {
                      backgroundColor: monthlyDates.includes(d) ? colors.primary : colors.card,
                      borderColor: monthlyDates.includes(d) ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateLabel, { color: monthlyDates.includes(d) ? '#fff' : colors.foreground }]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Repetition */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Repeat</Text>
          <View style={styles.repGrid}>
            {([
              { key: 'forever', label: 'Forever' },
              { key: 'days', label: '30 days' },
              { key: 'weeks', label: '12 weeks' },
              { key: 'months', label: '3 months' },
            ] as { key: RepetitionType; label: string }[]).map(r => (
              <TouchableOpacity
                key={r.key}
                onPress={() => setRepType(r.key)}
                style={[
                  styles.repBtn,
                  {
                    backgroundColor: repType === r.key ? colors.primary + '22' : colors.card,
                    borderColor: repType === r.key ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.repLabel, { color: repType === r.key ? colors.primary : colors.foreground }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes for this habit…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, minHeight: 80 }]}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Subtasks (optional)
          </Text>

          <View
            style={[
              styles.subtaskInputRow,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <TextInput
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add a subtask..."
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.subtaskInput,
                {
                  color: colors.foreground,
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
            />

            <TouchableOpacity
              onPress={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              style={[
                styles.subtaskAddButton,
                {
                  backgroundColor: colors.primary,
                  opacity: newSubtaskTitle.trim() ? 1 : 0.45,
                },
              ]}
            >
              <Feather
                name="plus"
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {subtasks.map(st => (
            <View
              key={st.id}
              style={[
                styles.subtaskRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={st.title}
                onChangeText={text =>
                  setSubtasks(prev =>
                    prev.map(s =>
                      s.id === st.id
                        ? { ...s, title: text }
                        : s
                    )
                  )
                }
                placeholder="Subtask"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.subtaskLabel,
                  {
                    color: colors.foreground,
                    flex: 1,
                    paddingVertical: 2,
                  },
                ]}
              />

              <TouchableOpacity
                onPress={() => handleDeleteSubtask(st.id)}
              >
                <Feather
                  name="trash-2"
                  size={16}
                  color="#ef4444"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  nameRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  emojiBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 26 },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Inter_500Medium',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emojiChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipText: { fontSize: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: 10 },
  textInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  chipScroll: { flexDirection: 'row' },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  catChipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  freqLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: { fontSize: 28, fontFamily: 'Inter_700Bold', minWidth: 60, textAlign: 'center' },
  datesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  repGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  repBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  repLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
  },

  subtaskInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 10,
  },

  subtaskAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },

  subtaskLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },

});
