package com.forgepromises.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface HabitLogDao {
    @Query("SELECT * FROM habit_logs")
    suspend fun getAll(): List<HabitLogEntity>

    @Query("SELECT * FROM habit_logs")
    fun observeAll(): Flow<List<HabitLogEntity>>

    @Query("SELECT COUNT(*) FROM habit_logs")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(logs: List<HabitLogEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: HabitLogEntity)

    @Query("SELECT * FROM habit_logs WHERE habitId = :habitId AND date = :date LIMIT 1")
    suspend fun findByHabitAndDate(habitId: String, date: String): HabitLogEntity?

    @Query("DELETE FROM habit_logs WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM habit_logs")
    suspend fun deleteAll()
}
