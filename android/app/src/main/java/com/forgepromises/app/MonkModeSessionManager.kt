package com.forgepromises.app

import android.content.Context
import android.content.Intent
import androidx.datastore.core.DataStore
import androidx.datastore.dataStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class MonkModeSessionManager private constructor(
    private val dataStore: DataStore<MonkModeState>,
    private val dateProvider: DateProvider
) {
    companion object {
        private val Context.monkModeDataStore: DataStore<MonkModeState> by dataStore(
            fileName = "monk_mode_session.pb",
            serializer = MonkModeSessionSerializer
        )

        @Volatile
        private var instance: MonkModeSessionManager? = null

        fun getInstance(context: Context): MonkModeSessionManager {
            return instance ?: synchronized(this) {
                instance ?: MonkModeSessionManager(
                    context.applicationContext.monkModeDataStore,
                    SystemDateProvider()
                ).also { instance = it }
            }
        }

        fun habitsFromReadableArray(array: ReadableArray): List<ActiveHabit> {
            val habits = mutableListOf<ActiveHabit>()
            for (i in 0 until array.size()) {
                val map = array.getMap(i) ?: continue
                habits.add(
                    ActiveHabit.newBuilder()
                        .setId(map.getString("id") ?: "")
                        .setName(map.getString("name") ?: "")
                        .setCompleted(map.getBoolean("completed"))
                        .build()
                )
            }
            return habits
        }

        fun habitsToWritableArray(habits: List<ActiveHabit>): WritableArray {
            val array = Arguments.createArray()
            habits.forEach { habit ->
                val map = Arguments.createMap()
                map.putString("id", habit.id)
                map.putString("name", habit.name)
                map.putBoolean("completed", habit.completed)
                array.pushMap(map)
            }
            return array
        }

        fun stateToWritableMap(state: MonkModeState, dateProvider: DateProvider): WritableMap {
            val isValid = state.isActive && state.sessionDate == dateProvider.today()
            val map = Arguments.createMap()
            map.putBoolean("isActive", isValid)
            map.putString("sessionDate", state.sessionDate)
            map.putDouble("startedAt", state.startedAt.toDouble())
            map.putInt("completedCount", state.habitsList.count { it.completed })
            map.putInt("totalCount", state.habitsList.size)
            map.putArray("habits", habitsToWritableArray(state.habitsList))
            return map
        }
    }

    // Mutex ONLY for the read-check-write sequence in getValidState().
    // DataStore.updateData() already serializes writes internally,
    // so individual updateData() calls don't need external locking.
    private val expiryMutex = Mutex()

    suspend fun getState(): MonkModeState = dataStore.data.first()

    /**
     * Returns the current state if the session is active AND belongs to today.
     * If stale, expires it atomically (read-check-write under mutex) and returns null.
     */
    suspend fun getValidState(): MonkModeState? {
        val current = dataStore.data.first()

        if (!current.isActive) return null

        if (current.sessionDate != dateProvider.today()) {
            // Atomic read-check-write: re-read inside mutex to avoid
            // expiring a session that another coroutine just refreshed.
            expiryMutex.withLock {
                val fresh = dataStore.data.first()
                if (fresh.isActive && fresh.sessionDate != dateProvider.today()) {
                    dataStore.updateData { it.toBuilder().clear().setIsActive(false).build() }
                }
            }
            return null
        }

        return current
    }

    suspend fun hasUnfinishedHabits(): Boolean {
        val state = getValidState() ?: return false
        return state.habitsList.any { !it.completed }
    }

    suspend fun startSession(habits: List<ActiveHabit>, context: Context? = null) {
        dataStore.updateData { current ->
            current.toBuilder()
                .clear()
                .setIsActive(true)
                .setSessionDate(dateProvider.today())
                .setStartedAt(dateProvider.now().toEpochMilli())
                .addAllHabits(habits)
                .build()
        }

        if (context != null) {
            val intent = Intent(MonkModeService.ACTION_MONK_MODE_UPDATE)
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
        }
    }

    suspend fun completeHabitById(habitId: String, expectedSessionDate: String, context: Context? = null): Boolean {
        var changed = false

        dataStore.updateData { current ->
            if (!current.isActive || current.sessionDate != dateProvider.today()) {
                return@updateData current
            }

            if (expectedSessionDate != current.sessionDate) {
                return@updateData current
            }

            val habitsList = current.habitsList.toMutableList()
            for (i in habitsList.indices) {
                if (habitsList[i].id == habitId && !habitsList[i].completed) {
                    habitsList[i] = habitsList[i].toBuilder().setCompleted(true).build()
                    changed = true
                    break
                }
            }

            current.toBuilder()
                .clearHabits()
                .addAllHabits(habitsList)
                .build()
        }

        if (changed && context != null) {
            val intent = Intent(MonkModeService.ACTION_MONK_MODE_UPDATE)
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
        }

        return changed
    }

    suspend fun syncFromRN(rnHabits: List<ActiveHabit>, context: Context? = null) {
        dataStore.updateData { current ->
            if (!current.isActive || current.sessionDate != dateProvider.today()) {
                return@updateData current
            }

            val currentHabits = current.habitsList

            val mergedHabits = rnHabits.map { rnHabit ->
                val nativeHabit = currentHabits.find { it.id == rnHabit.id }
                if (nativeHabit?.completed == true) {
                    rnHabit.toBuilder().setCompleted(true).build()
                } else {
                    rnHabit
                }
            }

            current.toBuilder()
                .clearHabits()
                .addAllHabits(mergedHabits)
                .build()
        }

        if (context != null) {
            val intent = Intent(MonkModeService.ACTION_MONK_MODE_UPDATE)
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
        }
    }

    suspend fun stopSession(context: Context? = null) {
        dataStore.updateData { current ->
            current.toBuilder()
                .clear()
                .setIsActive(false)
                .build()
        }

        if (context != null) {
            val intent = Intent(MonkModeService.ACTION_MONK_MODE_UPDATE)
            intent.setPackage(context.packageName)
            context.sendBroadcast(intent)
        }
    }
}
