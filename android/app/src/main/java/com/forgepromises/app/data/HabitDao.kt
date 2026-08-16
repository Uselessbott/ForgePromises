package com.forgepromises.app.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface HabitDao {
    @Query("SELECT * FROM habits ORDER BY sortOrder ASC")
    suspend fun getAll(): List<HabitEntity>

    @Query("SELECT * FROM habits ORDER BY sortOrder ASC")
    fun observeAll(): Flow<List<HabitEntity>>

    @Query("SELECT COUNT(*) FROM habits")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(habits: List<HabitEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(habit: HabitEntity)

    @Delete
    suspend fun delete(habit: HabitEntity)

    @Query("DELETE FROM habits WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM habits")
    suspend fun deleteAll()
}
