import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useHabits } from '../context/HabitsContext';

export function HomeScreen() {
  const { habits, createHabit, markHabit, getHabitsForDate, getDailyScore } = useHabits();
  const [newHabitName, setNewHabitName] = useState('');
  const [today, setToday] = useState('');

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setToday(`${y}-${m}-${day}`);
  }, []);

  const todayHabits = getHabitsForDate(today);
  const score = getDailyScore(today);

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    
    createHabit({
      name: newHabitName.trim(),
      description: '',
      notes: '',
      priority: 'optional',
      frequency: 'daily',
      weekdays: [],
      monthlyDates: [],
      weeklyTarget: 0,
      repetition: { type: 'forever' },
    });
    setNewHabitName('');
  };

  const renderHabit = ({ item }: { item: any }) => {
    const isCompleted = item.completed;

    return (
      <TouchableOpacity
        onPress={() => markHabit(item.id, today)}
        style={{
          flexDirection: 'row',
          padding: 16,
          backgroundColor: isCompleted ? '#2d2d4e' : '#1a1a2e',
          marginVertical: 4,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: isCompleted ? '#4CAF50' : '#333355',
        }}
      >
        <Text style={{
          fontSize: 16,
          color: isCompleted ? '#4CAF50' : '#ffffff',
          textDecorationLine: isCompleted ? 'line-through' : 'none',
          opacity: isCompleted ? 0.6 : 1,
        }}>
          {item.name}
        </Text>
        <Text style={{ fontSize: 24 }}>
          {isCompleted ? '✅' : '⬜'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#0d0d1a' }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ffffff' }}>
          🔥 ForgePromises
        </Text>
        <Text style={{ fontSize: 14, color: '#666688', marginTop: 4 }}>
          {score.completed}/{score.total} completed today
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#333355',
            borderRadius: 8,
            padding: 12,
            marginRight: 8,
            color: '#ffffff',
            backgroundColor: '#1a1a2e',
          }}
          placeholder="Add a habit..."
          placeholderTextColor="#666688"
          value={newHabitName}
          onChangeText={setNewHabitName}
          onSubmitEditing={handleAddHabit}
        />
        <TouchableOpacity
          onPress={handleAddHabit}
          style={{
            backgroundColor: '#4CAF50',
            padding: 12,
            borderRadius: 8,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={todayHabits}
        renderItem={renderHabit}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#666688', marginTop: 40 }}>
            No habits for today. Add one above! 👆
          </Text>
        }
      />
    </View>
  );
}
