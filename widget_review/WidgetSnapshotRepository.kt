package com.forgepromises.app

import android.content.Context
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

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

// Data-layer only: writes come from the React Native bridge (JS is the one
// computing the snapshot from AsyncStorage), reads will be consumed by
// Glance widgets starting in Phase 3. Deliberately contains zero UI/Glance
// code - this is the boundary between "React Native writes" and "native
// Android reads" that lets the two sides stay decoupled.
object WidgetSnapshotRepository {

    private const val CURRENT_SCHEMA_VERSION = 1

    // Single atomic write. DataStore's edit{} transaction serializes
    // concurrent calls internally (via a Mutex + temp-file-then-rename on
    // disk), so multiple rapid writes from JS cannot corrupt the store -
    // each call either fully applies or doesn't; there's no partial state.
    suspend fun write(context: Context, snapshotJson: String) {
        context.widgetSnapshotDataStore.edit { prefs ->
            prefs[WidgetSnapshotKeys.SNAPSHOT_JSON] = snapshotJson
        }
    }

    // Returns null if no snapshot has ever been written (true first launch,
    // before the app has opened even once) or if the stored JSON is
    // malformed for any reason. Callers (Glance widgets, in Phase 3) must
    // treat null as "show an empty/zero-habits state", not as an error.
    suspend fun read(context: Context): WidgetSnapshot? {
        return try {
            val json = context.widgetSnapshotDataStore.data
                .map { it[WidgetSnapshotKeys.SNAPSHOT_JSON] }
                .first() ?: return null
            parse(json)
        } catch (e: Exception) {
            null
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
            // Malformed JSON from a corrupted write or a future/incompatible
            // schema version - fail gracefully rather than crash the widget.
            null
        }
    }
}
