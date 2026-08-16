import React, {useState, useRef, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Animated, Modal, TextInput} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Habit, HabitLog, Subtask } from '@/context/types';

interface HabitCardProps {
  habit: Habit;
  log: HabitLog | undefined;
  streak: number;
  isToday: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  weeklyProgress?: { completed: number; target: number };
  onToggleSubtask?: (subtaskId: string) => void;
  onRenameSubtask?: (subtaskId: string, title: string) => void;
  onDeleteSubtask?: (subtaskId: string) => void;
}

export function HabitCard({
  habit,
  log,
  streak,
  isToday,
  onToggle,
  onLongPress,
  weeklyProgress,
  onToggleSubtask,
  onRenameSubtask,
  onDeleteSubtask,
}: HabitCardProps) {
  const colors = useColors();
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const hasSubtasks = (habit.subtasks?.length ?? 0) > 0;

  const isCompleted = hasSubtasks
    ? habit.subtasks!.every(
        st => log?.completedSubtasks?.includes(st.id) ?? false
      )
    : log?.status === 'completed';

  const isFrozen = log?.status === 'frozen';

  function handleToggle() {
    if (!isToday) return;
    if (habit.subtasks?.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }

  const checkboxColor = isCompleted
    ? colors.primary
    : isFrozen
    ? '#60A5FA'
    : colors.border;

  const checkboxBg = isCompleted
    ? colors.primary
    : isFrozen
    ? 'rgba(96,165,250,0.15)'
    : 'transparent';

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <TouchableOpacity
        onPress={handleToggle}
        disabled={!isToday}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={[styles.checkbox, { borderColor: checkboxColor, backgroundColor: checkboxBg }]}
        activeOpacity={0.7}
      >
        {isCompleted && <Feather name="check" size={13} color={colors.primaryForeground} />}
        {isFrozen && <Text style={styles.frozenIcon}>❄️</Text>}
      </TouchableOpacity>

      <Text style={styles.emoji}>{habit.emoji || '✨'}</Text>

      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            { color: isCompleted ? colors.mutedForeground : colors.foreground },
            isCompleted && styles.strikethrough,
          ]}
          numberOfLines={1}
        >
          {habit.name}
        </Text>
        {habit.frequency === 'weekly_target' && weeklyProgress ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {weeklyProgress.completed}/{weeklyProgress.target} this week
          </Text>
        ) : habit.description ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {habit.description}
          </Text>
        ) : null}

        {habit.subtasks?.length ? (
          <>
            <TouchableOpacity
              style={styles.subtaskToggle}
              activeOpacity={0.7}
              onPress={() => setShowSubtasks(!showSubtasks)}
            >
              <Text
                style={[
                  styles.subtaskToggleText,
                  { color: colors.primary }
                ]}
              >
                {showSubtasks
                  ? "▲ Hide subtasks"
                  : `▼ See ${habit.subtasks.length} subtasks`}
              </Text>
            </TouchableOpacity>

            {showSubtasks && (
              <View style={styles.subtasksContainer}>
            {habit.subtasks.map(subtask => {
              const checked =
                log?.completedSubtasks?.includes(subtask.id) ?? false;

              return (
                <TouchableOpacity
                  key={subtask.id}
                  style={styles.subtaskRow}
                  disabled={!isToday}
                  activeOpacity={0.7}
                  onPress={() => onToggleSubtask?.(subtask.id)}
                  onLongPress={() => {
                    setEditingSubtask(subtask);
                    setEditingTitle(subtask.title);
                  }}
                >
                  <View
                    style={[
                      styles.subtaskCheckbox,
                      {
                        borderColor: checked ? colors.primary : colors.border,
                        backgroundColor: checked
                          ? colors.primary
                          : 'transparent',
                      },
                    ]}
                  >
                    {checked && (
                      <Feather
                        name="check"
                        size={10}
                        color={colors.primaryForeground}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.subtaskText,
                      { color: checked ? colors.mutedForeground : colors.foreground },
                      checked && styles.subtaskTextCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {subtask.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
            )}
          </>
        ) : null}
      </View>


      <Modal
        visible={editingSubtask !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSubtask(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontFamily: "Inter_600SemiBold",
                marginBottom: 14,
              }}
            >
              Edit subtask
            </Text>

            <TextInput
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Subtask"
              placeholderTextColor={colors.mutedForeground}
              style={{
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 18,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >

              <TouchableOpacity
                onPress={() => setEditingSubtask(null)}
              >
                <Text style={{color: colors.mutedForeground}}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (editingSubtask && editingTitle.trim()) {
                    onRenameSubtask?.(
                      editingSubtask.id,
                      editingTitle.trim()
                    );
                  }
                  setEditingSubtask(null);
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "600",
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (editingSubtask) {
                    onDeleteSubtask?.(editingSubtask.id);
                  }
                  setEditingSubtask(null);
                }}
              >
                <Text
                  style={{
                    color: "#ef4444",
                    fontWeight: "600",
                  }}
                >
                  Delete
                </Text>
              </TouchableOpacity>

            </View>

          </View>
        </View>
      </Modal>

      {streak > 0 && (
        <View style={styles.streakRow}>
          <Text style={styles.fire}>🔥</Text>
          <Text style={[styles.streakNum, { color: colors.primary }]}>{streak}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frozenIcon: {
    fontSize: 11,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    letterSpacing: -0.2,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  sub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fire: {
    fontSize: 14,
  },
  streakNum: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  subtaskToggle: {
    marginTop: 6,
    marginBottom: 6,
  },
  subtaskToggleText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  subtasksContainer: {
    marginTop: 6,
    marginLeft: 8,
    gap: 6,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  subtaskTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
