package com.forgepromises.app

import android.content.Context
import kotlinx.coroutines.flow.Flow
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class WidgetHabit(
    val id: String,
    val name: String,
    val completed: Boolean
)

data class WidgetHeatmapDay(
    val date: String,
    val pct: Double,
    val hasData: Boolean
)

data class WidgetTodayTask(
    val id: String,
    val title: String,
    val completed: Boolean
)

data class WidgetSnapshot(
    val version: Int,
    val updatedAt: String,
    val today: String,
    val completed: Int,
    val total: Int,
    val remaining: Int,
    val streak: Int,
    val habits: List<WidgetHabit>,
    val heatmap: List<WidgetHeatmapDay>,
    val todayTasks: List<WidgetTodayTask>,
    val hasDailyPromise: Boolean = false,
    val selectedPromiseName: String? = null,
    val selectedPromiseCompleted: Boolean = false,
    val theme: String = "super_amoled",
    val accentColor: String = "orange"
)

object WidgetSnapshotRepository {

    private const val CURRENT_SCHEMA_VERSION = 1

    private fun logToFile(context: Context, message: String) {
        try {
            val dir = context.getExternalFilesDir(null) ?: context.cacheDir
            val file = File(dir, "widget_debug.log")
            file.appendText("${System.currentTimeMillis()} $message\n")
        } catch (_: Exception) {}
    }

    suspend fun write(context: Context, snapshotJson: String) {
        context.widgetSnapshotDataStore.edit { prefs ->
            prefs[WidgetSnapshotKeys.SNAPSHOT_JSON] = snapshotJson
        }
        val completedMatch = Regex("\"completed\":(\\d+)").find(snapshotJson)
        val comp = completedMatch?.groupValues?.get(1) ?: "?"
        logToFile(context, "REPO_WRITE completed=$comp")
    }

    suspend fun read(context: Context): WidgetSnapshot? {
        return try {
            val json = context.widgetSnapshotDataStore.data
                .map { it[WidgetSnapshotKeys.SNAPSHOT_JSON] }
                .first() ?: run {
                    logToFile(context, "REPO_READ null")
                    return null
                }
            val snapshot = parse(json)
            if (snapshot != null) {
                logToFile(context, "REPO_READ completed=${snapshot.completed} total=${snapshot.total}")
            } else {
                logToFile(context, "REPO_READ parse_failed")
            }
            snapshot
        } catch (e: Exception) {
            logToFile(context, "REPO_READ exception=${e.message}")
            null
        }
    }
    fun snapshotFlow(context: Context): Flow<WidgetSnapshot?> {
        return context.widgetSnapshotDataStore.data
            .map { prefs ->
                val json = prefs[WidgetSnapshotKeys.SNAPSHOT_JSON]
                json?.let { parse(it) }
            }
    }
    private fun parse(json: String): WidgetSnapshot? {
        return try {
            val obj = JSONObject(json)
            val version = obj.optInt("version", CURRENT_SCHEMA_VERSION)

            val habitsArray = obj.optJSONArray("habits") ?: JSONArray()
            val habits = (0 until habitsArray.length()).mapNotNull { i ->
                val h = habitsArray.optJSONObject(i) ?: return@mapNotNull null
                WidgetHabit(
                    id = h.optString("id", ""),
                    name = h.optString("name", ""),
                    completed = h.optBoolean("completed", false)
                )
            }

            val heatmapArray = obj.optJSONArray("heatmap") ?: JSONArray()
            val heatmap = (0 until heatmapArray.length()).mapNotNull { i ->
                val d = heatmapArray.optJSONObject(i) ?: return@mapNotNull null
                WidgetHeatmapDay(
                    date = d.optString("date", ""),
                    pct = d.optDouble("pct", 0.0),
                    hasData = d.optBoolean("hasData", false)
                )
            }

            val todayTasksArray = obj.optJSONArray("todayTasks") ?: JSONArray()
            val todayTasks = (0 until todayTasksArray.length()).mapNotNull { i ->
                val t = todayTasksArray.optJSONObject(i) ?: return@mapNotNull null
                WidgetTodayTask(
                    id = t.optString("id", ""),
                    title = t.optString("title", ""),
                    completed = t.optBoolean("completed", false)
                )
            }
            val theme = obj.optString("theme", "super_amoled")
            val accentColor = obj.optString("accentColor", "orange")

            WidgetSnapshot(
                version = version,
                updatedAt = obj.optString("updatedAt", ""),
                today = obj.optString("today", ""),
                completed = obj.optInt("completed", 0),
                total = obj.optInt("total", 0),
                remaining = obj.optInt("remaining", 0),
                streak = obj.optInt("streak", 0),
                habits = habits,
                heatmap = heatmap,
                todayTasks = todayTasks,
                hasDailyPromise = obj.optBoolean("hasDailyPromise", false),
                selectedPromiseName = obj.optString("selectedPromiseName", ""),
                selectedPromiseCompleted = obj.optBoolean("selectedPromiseCompleted", false),
                theme = theme,
                accentColor = accentColor
            )
        } catch (e: Exception) {
            null
        }
    }
}
