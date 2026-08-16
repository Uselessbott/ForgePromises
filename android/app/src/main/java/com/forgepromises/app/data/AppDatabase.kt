package com.forgepromises.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(entities = [HabitEntity::class, HabitLogEntity::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun habitDao(): HabitDao
    abstract fun habitLogDao(): HabitLogDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        // Standard double-checked-locking singleton - guarantees exactly one
        // database connection per process, shared by both the RN bridge
        // module and any Glance widget tap handler that touches Room.
        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "forgepromises.db"
                ).build().also { INSTANCE = it }
            }
        }
    }
}
