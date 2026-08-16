package com.forgepromises.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

// Mirrors context/types.ts Habit exactly. frequency values are stored as
// plain strings ('daily' | 'weekly' | 'weekly_target' | 'specific_days') -
// Room has no native enum type, and keeping this as a string avoids any
// translation layer that could drift from the JS-side type definition.
@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String?,
    val notes: String?,
    val emoji: String?,
    val categoryId: String,
    val createdAt: String,
    val archived: Boolean,
    val sortOrder: Int,
    val frequency: String,
    val weeklyTarget: Int?,
    val scheduleDays: List<Int>?,
    val reminderTime: String?,
    val color: String?
)

// Mirrors context/types.ts HabitLog exactly.
@Entity(tableName = "habit_logs")
data class HabitLogEntity(
    @PrimaryKey val id: String,
    val habitId: String,
    val date: String,
    val status: String,
    val completedAt: String?
)
