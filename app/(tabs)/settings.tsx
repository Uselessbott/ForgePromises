import React, { useState } from 'react';
import * as Notifications from 'expo-notifications';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { ACCENT_KEYS, ACCENT_MAP, type AccentKey } from '@/constants/colors';
import { useHabits } from '@/context/HabitsContext';
import {
  requestNotificationPermissions,
  scheduleRandomRemindersForAll,
  cancelAllHabitReminders,
  scheduleMidnightReset,
} from '@/utils/notifications';
import { startMonkMode, updateMonkMode, stopMonkMode } from '@/utils/monkMode';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, habits, resetAllData, getLifetimeStats, canUseStreakFreeze, getDailyScore } = useHabits();
  const [nameInput, setNameInput] = useState(settings.userName);
  const [nameSaved, setNameSaved] = useState(false);

  const stats = getLifetimeStats();
  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  function saveName() {
    if (!nameInput.trim()) return;
    updateSettings({ userName: nameInput.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function toggleNotifications(val: boolean) {
    if (val) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        // Do not update notificationsEnabled — permission was denied
        return;
      }
      // Permission granted — persist the enabled state immediately so the
      // profile toggle reflects reality without requiring an app restart
      updateSettings({ notificationsEnabled: true });
      await scheduleRandomRemindersForAll(habits);
      await scheduleMidnightReset();
    } else {
      await cancelAllHabitReminders(habits);
      await Notifications.cancelScheduledNotificationAsync('midnight_reset');
      updateSettings({ notificationsEnabled: false });
    }
  }

  async function toggleMonkMode(val: boolean) {
    updateSettings({ monkModeEnabled: val });
    if (val) {
      // Request notification permission first — foreground service needs it on Android 13+
      const granted = await requestNotificationPermissions();
      if (!granted) {
        // Revert the toggle if permission was denied
        updateSettings({ monkModeEnabled: false });
        Alert.alert(
          'Permission Required',
          'Monk Mode needs notification permission to show the persistent focus notification.'
        );
        return;
      }
      // Compute remaining habits for today to show the correct count immediately
      const today = new Date().toISOString().split('T')[0];
      const score = getDailyScore(today);
      const remaining = score.total - score.completed;
      startMonkMode(remaining);
    } else {
      stopMonkMode();
    }
  }

  function handleResetData() {
    Alert.alert(
      '⚠️ Reset All Data',
      'This permanently deletes all habits, streaks, statistics, calendar history, reminders, notes and settings.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            stopMonkMode();
            await resetAllData();
            setNameInput('');
          },
        },
      ],
    );
  }

  const sections: { icon: string; label: string; value: string }[] = [
    { icon: '✅', label: 'Total Completed', value: stats.totalCompleted.toString() },
    { icon: '❌', label: 'Total Missed', value: stats.totalMissed.toString() },
    { icon: '📊', label: 'Overall Completion', value: `${stats.overallCompletion}%` },
    { icon: '🔥', label: 'Longest Ever Streak', value: `${stats.longestEverStreak} days` },
    { icon: '⚡', label: 'Current Best Streak', value: `${stats.currentBestStreak} days` },
    { icon: '📅', label: 'Active Days', value: stats.activeDays.toString() },
    { icon: '💪', label: 'Habits Created', value: stats.habitsCreated.toString() },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>

        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '22' }]}>
            <Text style={styles.avatarEmoji}>🔥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>YOUR NAME</Text>
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter your name..."
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
              <TouchableOpacity
                onPress={saveName}
                style={[styles.saveBtn, { backgroundColor: nameSaved ? '#22c55e' : colors.primary }]}
                activeOpacity={0.8}
              >
                <Feather name={nameSaved ? 'check' : 'save'} size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            {settings.userName ? (
              <Text style={[styles.greetingPreview, { color: colors.mutedForeground }]}>
                Preview: "{settings.userName}, keep going."
              </Text>
            ) : null}
          </View>
        </View>

        {/* Lifetime Stats */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>LIFETIME STATISTICS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
          {sections.map((s, i) => (
            <View key={s.label} style={[styles.statRow, { borderBottomColor: colors.border, borderBottomWidth: i < sections.length - 1 ? 1 : 0 }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statLabel, { color: colors.foreground }]}>{s.label}</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Streak Freeze Status */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>STREAK FREEZE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.freezeRow}>
            <Text style={{ fontSize: 28 }}>❄️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                {canUseStreakFreeze() ? '1 freeze available this month' : 'Freeze used this month'}
              </Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                Resets on the 1st of each month. Protects your entire day.
              </Text>
            </View>
            <View style={[styles.freezeBadge, { backgroundColor: canUseStreakFreeze() ? '#3B82F622' : colors.card }]}>
              <Text style={[{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: canUseStreakFreeze() ? '#60A5FA' : colors.mutedForeground }]}>
                {canUseStreakFreeze() ? 'Ready' : 'Used'}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
          <Text style={[styles.settingLabel, { color: colors.foreground, marginBottom: 12 }]}>Theme</Text>
          {(['super_amoled', 'light'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => updateSettings({ theme: t })}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: settings.theme === t ? colors.primary : colors.border,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                {settings.theme === t && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.primary,
                  }} />
                )}
              </View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
                {t === 'super_amoled' ? 'Super AMOLED' : 'Light'}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 16 }} />
          <Text style={[styles.settingLabel, { color: colors.foreground, marginBottom: 12 }]}>Accent Color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {ACCENT_KEYS.map((accent) => (
              <TouchableOpacity
                key={accent}
                onPress={() => updateSettings({ accentColor: accent } as any)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: ACCENT_MAP[accent],
                  borderWidth: 2,
                  borderColor: (settings as any).accentColor === accent ? colors.foreground : 'transparent',
                }}
                activeOpacity={0.7}
              />
            ))}
          </View>
        </View>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SETTINGS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Notifications</Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Habit reminders and daily reset alerts</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Monk Mode</Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Maximum accountability. No distractions.</Text>
            </View>
            <Switch
              value={settings.monkModeEnabled}
              onValueChange={toggleMonkMode}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* App Info */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            ForgePromises is a local-first discipline app. No accounts, no cloud, no tracking. Everything lives on your device.
          </Text>
          <Text style={[styles.versionText, { color: colors.mutedForeground + '88' }]}>Version 1.0.0</Text>
        </View>

        {/* Reset */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
        <TouchableOpacity
          onPress={handleResetData}
          style={[styles.resetBtn, { backgroundColor: '#ef444411', borderColor: '#ef444433' }]}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={18} color="#ef4444" />
          <Text style={styles.resetBtnText}>Reset All Data</Text>
        </TouchableOpacity>
        <Text style={[styles.resetWarning, { color: colors.mutedForeground }]}>
          Permanently deletes all habits, streaks, statistics, calendar, reminders, notes and settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, overflow: 'hidden' },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarEmoji: { fontSize: 28 },
  cardLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 8 },
  nameRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontFamily: 'Inter_500Medium' },
  saveBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  greetingPreview: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 10 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  statIcon: { fontSize: 18 },
  statLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  statValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingLabel: { fontSize: 15, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  settingDesc: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  freezeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  freezeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aboutText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 8 },
  versionText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1, paddingVertical: 16, marginBottom: 8 },
  resetBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#ef4444' },
  resetWarning: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
});