package com.forgepromises.app.data

import androidx.room.TypeConverter

// Room has no native support for List<Int>, so scheduleDays is stored as a
// comma-separated string internally. This is purely a storage detail -
// every DAO/entity-facing API still deals in List<Int>?, never raw strings.
class Converters {
    @TypeConverter
    fun fromIntList(list: List<Int>?): String? =
        list?.joinToString(",")

    @TypeConverter
    fun toIntList(value: String?): List<Int>? =
        value?.takeIf { it.isNotEmpty() }?.split(",")?.map { it.trim().toInt() }
}
